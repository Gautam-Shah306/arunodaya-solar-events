import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { SnapshotLocation, SnapshotV1 } from '@arunodaya/contracts';
import { useSnapshot, type SnapshotState } from '../src/ui/use-snapshot.js';
import type { SnapshotService } from '../src/snapshot/service.js';

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const MOCK_LOCATION: SnapshotLocation = {
  lat: 22.3,
  lon: 70.8,
  label: 'Rajkot',
  source: 'manual',
  fixAtMs: 1763164800000,
};

const MOCK_SNAPSHOT: SnapshotV1 = {
  schemaVersion: 1,
  engine: { name: 'astronomy-engine', version: '2.1.19' },
  generatedAtMs: 1763164800000,
  location: MOCK_LOCATION,
  days: [],
  moonEvents: [],
};

function TestSnapshotComponent({
  service,
  location,
  onState,
}: {
  service: SnapshotService;
  location: SnapshotLocation;
  onState: (state: SnapshotState) => void;
}) {
  const state = useSnapshot(service, location);
  React.useEffect(() => {
    onState(state);
  }, [state, onState]);
  return React.createElement('div', { 'data-testid': 'state' }, state.state);
}

describe('useSnapshot hook', () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    document.body.removeChild(container);
    vi.restoreAllMocks();
  });

  it('loads snapshot and transitions to ready state', async () => {
    const service: SnapshotService = {
      load: vi.fn().mockResolvedValue({
        ok: true,
        value: { source: 'built', snapshot: MOCK_SNAPSHOT },
      }),
      rebuild: vi.fn().mockResolvedValue({ ok: true, value: MOCK_SNAPSHOT }),
    };

    const states: SnapshotState[] = [];
    const root = createRoot(container);

    await act(async () => {
      root.render(
        React.createElement(TestSnapshotComponent, {
          service,
          location: MOCK_LOCATION,
          onState: (s) => states.push(s),
        }),
      );
    });

    expect(states[0]?.state).toBe('loading');
    const finalState = states[states.length - 1];
    expect(finalState?.state).toBe('ready');
    if (finalState?.state === 'ready') {
      expect(finalState.snapshot).toBe(MOCK_SNAPSHOT);
      expect(finalState.source).toBe('built');
    }
  });

  it('transitions to error state on failure and supports retry', async () => {
    let callCount = 0;
    const service: SnapshotService = {
      load: vi.fn().mockImplementation(async () => {
        callCount++;
        if (callCount === 1) {
          return {
            ok: false,
            error: { code: 'NETWORK_ERROR', message: 'Failed to build snapshot' },
          };
        }
        return {
          ok: true,
          value: { source: 'cache', snapshot: MOCK_SNAPSHOT },
        };
      }),
      rebuild: vi.fn().mockResolvedValue({ ok: true, value: MOCK_SNAPSHOT }),
    };

    const states: SnapshotState[] = [];
    const root = createRoot(container);

    await act(async () => {
      root.render(
        React.createElement(TestSnapshotComponent, {
          service,
          location: MOCK_LOCATION,
          onState: (s) => states.push(s),
        }),
      );
    });

    const errorState = states[states.length - 1];
    expect(errorState?.state).toBe('error');
    if (errorState?.state === 'error') {
      expect(errorState.message).toBe('Failed to build snapshot');
      // Trigger retry
      await act(async () => {
        errorState.retry();
      });
    }

    const finalState = states[states.length - 1];
    expect(finalState?.state).toBe('ready');
  });

  it('ignores resolution when component unmounts before service.load completes', async () => {
    let resolveFn:
      ((val: { ok: true; value: { source: 'cache'; snapshot: SnapshotV1 } }) => void) | undefined;
    const service: SnapshotService = {
      load: vi.fn().mockImplementation(
        () =>
          new Promise<{ ok: true; value: { source: 'cache'; snapshot: SnapshotV1 } }>((resolve) => {
            resolveFn = resolve;
          }),
      ),
      rebuild: vi.fn().mockResolvedValue({ ok: true, value: MOCK_SNAPSHOT }),
    };

    const states: SnapshotState[] = [];
    const root = createRoot(container);

    act(() => {
      root.render(
        React.createElement(TestSnapshotComponent, {
          service,
          location: MOCK_LOCATION,
          onState: (s) => states.push(s),
        }),
      );
    });

    expect(states[0]?.state).toBe('loading');

    // Unmount before resolving
    act(() => {
      root.unmount();
    });

    const countBeforeResolve = states.length;

    // Resolve now
    await act(async () => {
      resolveFn?.({
        ok: true,
        value: { source: 'cache', snapshot: MOCK_SNAPSHOT },
      });
    });

    // States should remain unchanged because update was ignored after unmount
    expect(states.length).toBe(countBeforeResolve);
  });

  it('useSnapshot refresh keeps the current data while rebuilding', async () => {
    let rebuildResolve: ((val: { ok: true; value: SnapshotV1 }) => void) | undefined;
    const freshSnapshot: SnapshotV1 = { ...MOCK_SNAPSHOT, generatedAtMs: 1763999999000 };
    const service: SnapshotService = {
      load: vi.fn().mockResolvedValue({
        ok: true,
        value: { source: 'cache', snapshot: MOCK_SNAPSHOT },
      }),
      rebuild: vi.fn().mockImplementation(
        () =>
          new Promise<{ ok: true; value: SnapshotV1 }>((resolve) => {
            rebuildResolve = resolve;
          }),
      ),
    };

    const states: SnapshotState[] = [];
    const root = createRoot(container);

    await act(async () => {
      root.render(
        React.createElement(TestSnapshotComponent, {
          service,
          location: MOCK_LOCATION,
          onState: (s) => states.push(s),
        }),
      );
    });

    const readyState = states[states.length - 1];
    expect(readyState?.state).toBe('ready');

    // Trigger refresh
    let refreshPromise: Promise<void> | undefined;
    act(() => {
      refreshPromise = readyState?.refresh();
    });

    // While rebuilding, state stays 'ready', data is kept, refreshing is true
    const refreshingState = states[states.length - 1];
    expect(refreshingState?.state).toBe('ready');
    if (refreshingState?.state === 'ready') {
      expect(refreshingState.snapshot).toBe(MOCK_SNAPSHOT);
      expect(refreshingState.refreshing).toBe(true);
    }

    // Resolve rebuild
    await act(async () => {
      rebuildResolve?.({ ok: true, value: freshSnapshot });
      await refreshPromise;
    });

    const doneState = states[states.length - 1];
    expect(doneState?.state).toBe('ready');
    if (doneState?.state === 'ready') {
      expect(doneState.snapshot).toBe(freshSnapshot);
      expect(doneState.refreshing).toBe(false);
    }
  });

  it('useSnapshot refresh failure keeps the data and reports the error', async () => {
    const service: SnapshotService = {
      load: vi.fn().mockResolvedValue({
        ok: true,
        value: { source: 'cache', snapshot: MOCK_SNAPSHOT },
      }),
      rebuild: vi.fn().mockResolvedValue({
        ok: false,
        error: { code: 'NETWORK_ERROR', message: 'Failed to refresh snapshot' },
      }),
    };

    const states: SnapshotState[] = [];
    const root = createRoot(container);

    await act(async () => {
      root.render(
        React.createElement(TestSnapshotComponent, {
          service,
          location: MOCK_LOCATION,
          onState: (s) => states.push(s),
        }),
      );
    });

    const readyState = states[states.length - 1];
    expect(readyState?.state).toBe('ready');

    await act(async () => {
      await readyState?.refresh();
    });

    const failedState = states[states.length - 1];
    expect(failedState?.state).toBe('ready');
    if (failedState?.state === 'ready') {
      expect(failedState.snapshot).toBe(MOCK_SNAPSHOT);
      expect(failedState.refreshing).toBe(false);
      expect(failedState.refreshError).toBe('Failed to refresh snapshot');
    }
  });

  it('useSnapshot auto refresh runs once per guard interval when the snapshot is expiring', async () => {
    // Expiring snapshot (e.g. generated 25 days ago)
    const expiringSnapshot: SnapshotV1 = {
      ...MOCK_SNAPSHOT,
      generatedAtMs: 1763164800000 - 25 * 86400000,
    };
    const rebuildMock = vi.fn().mockResolvedValue({
      ok: true,
      value: MOCK_SNAPSHOT,
    });
    const service: SnapshotService = {
      load: vi.fn().mockResolvedValue({
        ok: true,
        value: { source: 'cache', snapshot: expiringSnapshot },
      }),
      rebuild: rebuildMock,
    };

    function TestAutoRefreshComponent() {
      useSnapshot(service, MOCK_LOCATION, {
        autoRefresh: true,
        nowMs: 1763164800000,
      });
      return React.createElement('div', null, 'AutoRefreshTest');
    }

    const root = createRoot(container);

    await act(async () => {
      root.render(React.createElement(TestAutoRefreshComponent));
    });

    // Rebuild should be called once on mount due to expiring snapshot
    expect(rebuildMock).toHaveBeenCalledTimes(1);

    // Re-rendering should not call rebuild again within the guard interval
    await act(async () => {
      root.render(React.createElement(TestAutoRefreshComponent));
    });
    expect(rebuildMock).toHaveBeenCalledTimes(1);
  });

  it('useSnapshot refresh handles thrown Error and non-Error rejections', async () => {
    const service: SnapshotService = {
      load: vi.fn().mockResolvedValue({
        ok: true,
        value: { source: 'cache', snapshot: MOCK_SNAPSHOT },
      }),
      rebuild: vi
        .fn()
        .mockRejectedValueOnce(new Error('Thrown rebuild failure'))
        .mockRejectedValueOnce('String rebuild failure'),
    };

    const states: SnapshotState[] = [];
    const root = createRoot(container);

    await act(async () => {
      root.render(
        React.createElement(TestSnapshotComponent, {
          service,
          location: MOCK_LOCATION,
          onState: (s) => states.push(s),
        }),
      );
    });

    await act(async () => {
      await states[states.length - 1]?.refresh();
    });
    expect(states[states.length - 1]?.refreshError).toBe('Thrown rebuild failure');

    await act(async () => {
      await states[states.length - 1]?.refresh();
    });
    expect(states[states.length - 1]?.refreshError).toBe('String rebuild failure');
  });
});
