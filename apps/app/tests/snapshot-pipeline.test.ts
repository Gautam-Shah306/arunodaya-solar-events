import { describe, expect, it } from 'vitest';
import type { SnapshotLocation } from '@arunodaya/contracts';
import { handleMessage } from '../src/snapshot/request-handler.js';
import { createSnapshotClient, type WorkerLike } from '../src/snapshot/client.js';
import { createSnapshotService, SNAPSHOT_STORE_KEY } from '../src/snapshot/service.js';
import { createMemoryStore } from '../src/core/storage.js';
import type { BuildRequest } from '../src/snapshot/worker-protocol.js';

const RAJKOT_LOCATION: SnapshotLocation = {
  lat: 22.3,
  lon: 70.8,
  label: 'Rajkot',
  source: 'manual',
  fixAtMs: 1763164800000,
};

class MockWorker implements WorkerLike {
  public messageListeners = new Set<(event: { data: unknown }) => void>();
  public errorListeners = new Set<(event: any) => void>();
  public postedMessages: unknown[] = [];
  public terminated = false;

  postMessage(message: unknown): void {
    this.postedMessages.push(message);
  }

  addEventListener(type: 'message' | 'error', listener: (event: any) => void): void {
    if (type === 'message') this.messageListeners.add(listener);
    if (type === 'error') this.errorListeners.add(listener);
  }

  terminate(): void {
    this.terminated = true;
  }

  respond(data: unknown): void {
    for (const l of this.messageListeners) {
      l({ data });
    }
  }

  fail(err: unknown): void {
    for (const l of this.errorListeners) {
      l(err);
    }
  }
}

describe('Snapshot Pipeline', () => {
  it('worker request handler returns a validated snapshot for a build request', () => {
    const req: BuildRequest = {
      id: 101,
      type: 'build',
      location: RAJKOT_LOCATION,
      startIstDate: '2026-11-16',
      dayCount: 7,
      generatedAtMs: 1763274600000,
    };

    const resp = handleMessage(req);
    expect(resp).not.toBeNull();
    expect(resp?.id).toBe(101);
    expect(resp?.ok).toBe(true);
    if (resp?.ok) {
      expect(resp.snapshot.location.label).toBe('Rajkot');
      expect(resp.snapshot.days.length).toBe(7);
      expect(resp.snapshot.schemaVersion).toBe(1);
    }
  });

  it('worker request handler returns an error for an invalid request', () => {
    const invalidReq = {
      id: 42,
      type: 'build',
      location: RAJKOT_LOCATION,
      startIstDate: 'not-a-date',
      dayCount: -1,
      generatedAtMs: 1763274600000,
    };

    const resp = handleMessage(invalidReq);
    expect(resp).not.toBeNull();
    expect(resp?.id).toBe(42);
    expect(resp?.ok).toBe(false);
  });

  it('worker request handler ignores foreign messages', () => {
    expect(handleMessage(null)).toBeNull();
    expect(handleMessage(undefined)).toBeNull();
    expect(handleMessage('string-message')).toBeNull();
    expect(handleMessage({ type: 'other-action' })).toBeNull();
  });

  it('snapshot client resolves a build request through the worker', async () => {
    let workerRef: MockWorker | null = null;
    const client = createSnapshotClient({
      createWorker: () => {
        workerRef = new MockWorker();
        return workerRef;
      },
    });

    const promise = client.build({
      location: RAJKOT_LOCATION,
      startIstDate: '2026-11-16',
      dayCount: 5,
      generatedAtMs: 1763274600000,
    });

    expect(workerRef).not.toBeNull();
    expect(workerRef!.postedMessages.length).toBe(1);
    const sentReq = workerRef!.postedMessages[0] as BuildRequest;
    expect(sentReq.id).toBe(1);

    const mockSnap = handleMessage(sentReq);
    workerRef!.respond(mockSnap);

    const result = await promise;
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.days.length).toBe(5);
    }
  });

  it('snapshot client handles an error response from the worker', async () => {
    let workerRef: MockWorker | null = null;
    const client = createSnapshotClient({
      createWorker: () => {
        workerRef = new MockWorker();
        return workerRef;
      },
    });

    const promise = client.build({
      location: RAJKOT_LOCATION,
      startIstDate: '2026-11-16',
      dayCount: 3,
      generatedAtMs: 1763274600000,
    });

    workerRef!.respond({
      id: 1,
      ok: false,
      error: { code: 'CALC_ERROR', message: 'Calculation failed inside worker' },
    });

    const result = await promise;
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('CALC_ERROR');
    }
  });

  it('snapshot client terminates a stuck worker and falls back', async () => {
    let workerRef: MockWorker | null = null;
    const client = createSnapshotClient({
      createWorker: () => {
        workerRef = new MockWorker();
        return workerRef;
      },
      timeoutMs: 25,
    });

    const result = await client.build({
      location: RAJKOT_LOCATION,
      startIstDate: '2026-11-16',
      dayCount: 3,
      generatedAtMs: 1763274600000,
    });

    expect(workerRef!.terminated).toBe(true);
    expect(client.getDiagnostics().fallbackCount).toBe(1);
    expect(result.ok).toBe(true);
  });

  it('snapshot client terminates the worker on dispose', () => {
    let workerRef: MockWorker | null = null;
    const client = createSnapshotClient({
      createWorker: () => {
        workerRef = new MockWorker();
        return workerRef;
      },
    });

    // Initiate request to spin up worker
    void client.build({
      location: RAJKOT_LOCATION,
      startIstDate: '2026-11-16',
      dayCount: 3,
      generatedAtMs: 1763274600000,
    });

    expect(workerRef).not.toBeNull();
    expect(workerRef!.terminated).toBe(false);

    client.dispose();
    expect(workerRef!.terminated).toBe(true);
  });

  it('snapshot client rejects requests when disposed', async () => {
    const client = createSnapshotClient();
    client.dispose();

    const result = await client.build({
      location: RAJKOT_LOCATION,
      startIstDate: '2026-11-16',
      dayCount: 3,
      generatedAtMs: 1763274600000,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('DISPOSED');
    }
  });

  it('snapshot client times out and reports an error', async () => {
    let workerRef: MockWorker | null = null;
    const client = createSnapshotClient({
      createWorker: () => {
        workerRef = new MockWorker();
        return workerRef;
      },
      fallback: null, // Disable fallback to check raw timeout reporting
      timeoutMs: 25,
    });

    const result = await client.build({
      location: RAJKOT_LOCATION,
      startIstDate: '2026-11-16',
      dayCount: 3,
      generatedAtMs: 1763274600000,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('TIMEOUT');
    }
  });

  it('snapshot client falls back to the main thread builder when no worker can be created', async () => {
    const client = createSnapshotClient({
      createWorker: () => null,
    });

    const result = await client.build({
      location: RAJKOT_LOCATION,
      startIstDate: '2026-11-16',
      dayCount: 3,
      generatedAtMs: 1763274600000,
    });

    expect(result.ok).toBe(true);
    expect(client.getDiagnostics().fallbackCount).toBe(1);
  });

  it('snapshot service uses a valid cached snapshot for the same location', async () => {
    const store = createMemoryStore();
    const client = createSnapshotClient({ createWorker: () => null });
    const fixedNow = 1763274600000;
    const clock = { nowMs: () => fixedNow, now: () => fixedNow };

    const service = createSnapshotService({ store, client, clock });

    const firstLoad = await service.load(RAJKOT_LOCATION);
    expect(firstLoad.ok).toBe(true);
    if (firstLoad.ok) {
      expect(firstLoad.value.source).toBe('built');
    }

    const secondLoad = await service.load(RAJKOT_LOCATION);
    expect(secondLoad.ok).toBe(true);
    if (secondLoad.ok) {
      expect(secondLoad.value.source).toBe('cache');
    }
  });

  it('snapshot service rebuilds when the cached snapshot is expiring', async () => {
    const store = createMemoryStore();
    const client = createSnapshotClient({ createWorker: () => null });
    let currentNow = 1763274600000;
    const clock = { nowMs: () => currentNow, now: () => currentNow };

    const service = createSnapshotService({ store, client, clock });

    const firstLoad = await service.load(RAJKOT_LOCATION);
    expect(firstLoad.ok).toBe(true);

    // Advance clock past the expiration horizon (e.g. 85 days later, remaining <= 7 days)
    currentNow += 85 * 86400000;

    const secondLoad = await service.load(RAJKOT_LOCATION);
    expect(secondLoad.ok).toBe(true);
    if (secondLoad.ok) {
      expect(secondLoad.value.source).toBe('built');
    }
  });

  it('snapshot service rebuilds when the location changed', async () => {
    const store = createMemoryStore();
    const client = createSnapshotClient({ createWorker: () => null });
    const clock = { nowMs: () => 1763274600000, now: () => 1763274600000 };

    const service = createSnapshotService({ store, client, clock });

    await service.load(RAJKOT_LOCATION);

    const mumbaiLoc: SnapshotLocation = {
      lat: 18.92,
      lon: 72.83,
      label: 'Mumbai',
      source: 'manual',
      fixAtMs: 1763164800000,
    };
    const mumbaiLoad = await service.load(mumbaiLoc);
    expect(mumbaiLoad.ok).toBe(true);
    if (mumbaiLoad.ok) {
      expect(mumbaiLoad.value.source).toBe('built');
      expect(mumbaiLoad.value.snapshot.location.label).toBe('Mumbai');
    }
  });

  it('snapshot service rebuilds when the cache is corrupt or fails migration', async () => {
    const store = createMemoryStore();
    store.set(SNAPSHOT_STORE_KEY, '{ corrupt-json ...');
    const client = createSnapshotClient({ createWorker: () => null });
    const clock = { nowMs: () => 1763274600000, now: () => 1763274600000 };

    const service = createSnapshotService({ store, client, clock });
    const loadRes = await service.load(RAJKOT_LOCATION);
    expect(loadRes.ok).toBe(true);
    if (loadRes.ok) {
      expect(loadRes.value.source).toBe('built');
    }
  });

  it('snapshot service saves a newly built snapshot', async () => {
    const store = createMemoryStore();
    expect(store.get(SNAPSHOT_STORE_KEY)).toBeNull();

    const client = createSnapshotClient({ createWorker: () => null });
    const clock = { nowMs: () => 1763274600000, now: () => 1763274600000 };

    const service = createSnapshotService({ store, client, clock });
    await service.load(RAJKOT_LOCATION);

    expect(store.get(SNAPSHOT_STORE_KEY)).not.toBeNull();
    const parsed = JSON.parse(store.get(SNAPSHOT_STORE_KEY)!);
    expect(parsed.schemaVersion).toBe(1);
    expect(parsed.location.label).toBe('Rajkot');
  });

  it('snapshot service reports a build failure without caching', async () => {
    const store = createMemoryStore();
    const failingClient = {
      async build() {
        return {
          ok: false as const,
          error: { code: 'ASTRONOMY_CALC_FAILED', message: 'Calculations failed' },
        };
      },
      dispose() {},
      getDiagnostics() {
        return { fallbackCount: 0, totalRequests: 1 };
      },
    };
    const clock = { nowMs: () => 1763274600000, now: () => 1763274600000 };

    const service = createSnapshotService({ store, client: failingClient, clock });
    const res = await service.load(RAJKOT_LOCATION);

    expect(res.ok).toBe(false);
    expect(store.get(SNAPSHOT_STORE_KEY)).toBeNull();
  });
});
