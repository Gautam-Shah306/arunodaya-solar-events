import { describe, expect, it } from 'vitest';
import type { DayRecord, SnapshotLocation, SnapshotV1 } from '@arunodaya/contracts';
import { createSnapshotService, SNAPSHOT_STORE_KEY } from '../src/snapshot/service.js';
import { createMemoryStore } from '../src/core/storage.js';
import type { SnapshotClient } from '../src/snapshot/client.js';

const MOCK_LOCATION: SnapshotLocation = {
  lat: 22.3,
  lon: 70.8,
  label: 'Rajkot',
  source: 'manual',
  fixAtMs: 1763164800000,
};

function createMockDay(istDate: string): DayRecord {
  return {
    istDate,
    sunrise: { exactMs: 1763254800000, displayMs: 1763254800000 },
    navkarshi: { exactMs: 1763257680000, displayMs: 1763257680000 },
    sunset: { exactMs: 1763294400000, displayMs: 1763294400000 },
    civilDawn: { exactMs: 1763253000000, displayMs: 1763253000000 },
    civilDusk: { exactMs: 1763296200000, displayMs: 1763296200000 },
    solarNoonMs: 1763274600000,
    goldenMorning: {
      start: { exactMs: 1763254800000, displayMs: 1763254800000 },
      end: { exactMs: 1763258400000, displayMs: 1763258400000 },
    },
    goldenEvening: {
      start: { exactMs: 1763290800000, displayMs: 1763290800000 },
      end: { exactMs: 1763294400000, displayMs: 1763294400000 },
    },
    moonPhaseAtNoon: {
      phase: 0.25,
      illumination: 0.5,
    },
  };
}

describe('Snapshot Service rebuild and cache bypass', () => {
  it('service rebuild skips the cache and saves the new snapshot', async () => {
    const store = createMemoryStore();
    const fixedNowMs = 1763274600000;
    const clock = { nowMs: () => fixedNowMs, now: () => fixedNowMs };

    const initialSnapshot: SnapshotV1 = {
      schemaVersion: 1,
      engine: { name: 'astronomy-engine', version: '2.1.19' },
      generatedAtMs: 1763000000000,
      location: MOCK_LOCATION,
      days: [createMockDay('2026-11-16')],
      moonEvents: [],
    };
    store.set(SNAPSHOT_STORE_KEY, JSON.stringify(initialSnapshot));

    let buildCount = 0;
    const freshSnapshot: SnapshotV1 = {
      schemaVersion: 1,
      engine: { name: 'astronomy-engine', version: '2.1.19' },
      generatedAtMs: fixedNowMs,
      location: MOCK_LOCATION,
      days: [createMockDay('2026-11-16'), createMockDay('2026-11-17')],
      moonEvents: [],
    };

    const mockClient: SnapshotClient = {
      build: async () => {
        buildCount++;
        return { ok: true, value: freshSnapshot };
      },
      dispose: () => {},
      getDiagnostics: () => ({ totalRequests: 1, fallbackCount: 0 }),
    };

    const service = createSnapshotService({
      store,
      client: mockClient,
      clock,
    });

    const rebuildRes = await service.rebuild(MOCK_LOCATION);
    expect(rebuildRes.ok).toBe(true);
    expect(buildCount).toBe(1);
    if (rebuildRes.ok) {
      expect(rebuildRes.value.generatedAtMs).toBe(fixedNowMs);
      expect(rebuildRes.value.days.length).toBe(2);
    }

    // Verify stored cache was updated with fresh snapshot
    const stored = store.get(SNAPSHOT_STORE_KEY);
    expect(stored).not.toBeNull();
    const parsed = JSON.parse(stored!);
    expect(parsed.generatedAtMs).toBe(fixedNowMs);
  });

  it('service rebuild failure leaves the cached snapshot untouched', async () => {
    const store = createMemoryStore();
    const clock = { nowMs: () => 1000, now: () => 1000 };
    const cachedData = 'cached-data';
    store.set(SNAPSHOT_STORE_KEY, cachedData);

    const failingClient: SnapshotClient = {
      build: async () => ({
        ok: false,
        error: { code: 'CALC_FAILED', message: 'Engine calculation failed' },
      }),
      dispose: () => {},
      getDiagnostics: () => ({ totalRequests: 1, fallbackCount: 0 }),
    };

    const service = createSnapshotService({
      store,
      client: failingClient,
      clock,
    });

    const res = await service.rebuild(MOCK_LOCATION);
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error.code).toBe('CALC_FAILED');
      expect(res.error.message).toBe('Engine calculation failed');
    }
    // Verify cached snapshot in store is untouched
    expect(store.get(SNAPSHOT_STORE_KEY)).toBe(cachedData);
  });
});
