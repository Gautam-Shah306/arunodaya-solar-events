import { useCallback, useEffect, useRef, useState } from 'react';
import type { SnapshotLocation, SnapshotV1 } from '@arunodaya/contracts';
import { getSnapshotStatus } from '@arunodaya/engine';
import type { SnapshotService } from '../snapshot/service.js';

export const AUTO_REFRESH_THROTTLE_MS = 6 * 3600_000; // 6 hours
export const AUTO_REFRESH_KEY = 'arunodaya.lastAutoRefreshMs';

export interface UseSnapshotOptions {
  readonly autoRefresh?: boolean;
  readonly nowMs?: number;
}

export type SnapshotState =
  | {
      readonly state: 'loading';
      readonly refreshing: boolean;
      readonly refreshError: string | null;
      readonly refresh: () => Promise<void>;
    }
  | {
      readonly state: 'ready';
      readonly snapshot: SnapshotV1;
      readonly source: 'cache' | 'built';
      readonly refreshing: boolean;
      readonly refreshError: string | null;
      readonly refresh: () => Promise<void>;
    }
  | {
      readonly state: 'error';
      readonly message: string;
      readonly retry: () => void;
      readonly refreshing: boolean;
      readonly refreshError: string | null;
      readonly refresh: () => Promise<void>;
    };

/**
 * Hook loading and managing snapshot state for a given location.
 * Provides manual refresh and optional throttled auto-refresh when expiring/expired.
 */
export function useSnapshot(
  service: SnapshotService,
  location: SnapshotLocation,
  options?: UseSnapshotOptions,
): SnapshotState {
  const [coreState, setCoreState] = useState<
    | { readonly state: 'loading' }
    | {
        readonly state: 'ready';
        readonly snapshot: SnapshotV1;
        readonly source: 'cache' | 'built';
      }
    | {
        readonly state: 'error';
        readonly message: string;
        readonly retry: () => void;
      }
  >({ state: 'loading' });

  const [refreshing, setRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  const retry = useCallback(() => {
    setCoreState({ state: 'loading' });
    setRetryCount((c) => c + 1);
  }, []);

  const refresh = useCallback(async (): Promise<void> => {
    setRefreshing(true);
    setRefreshError(null);
    try {
      const res = await service.rebuild(location);
      if (res.ok) {
        setCoreState({
          state: 'ready',
          snapshot: res.value,
          source: 'built',
        });
      } else {
        setRefreshError(res.error.message);
      }
    } catch (err) {
      setRefreshError(err instanceof Error ? err.message : String(err));
    } finally {
      setRefreshing(false);
    }
  }, [service, location]);

  // Initial load
  useEffect(() => {
    let canceled = false;
    setCoreState({ state: 'loading' });

    void service.load(location).then((result) => {
      if (canceled) return;
      if (result.ok) {
        setCoreState({
          state: 'ready',
          snapshot: result.value.snapshot,
          source: result.value.source,
        });
      } else {
        setCoreState({
          state: 'error',
          message: result.error.message,
          retry,
        });
      }
    });

    return () => {
      canceled = true;
    };
  }, [service, location.lat, location.lon, location.label, retryCount, retry]);

  // Auto-refresh when snapshot is expiring or expired (throttled to at most once per 6 hours)
  const autoRefreshDoneRef = useRef(false);
  useEffect(() => {
    if (!options?.autoRefresh || coreState.state !== 'ready') return;
    if (autoRefreshDoneRef.current) return;

    const currentNow = options.nowMs ?? Date.now();
    const status = getSnapshotStatus(coreState.snapshot, currentNow);

    if (status === 'expiring' || status === 'expired') {
      try {
        const lastAutoMsStr =
          typeof window !== 'undefined' ? window.localStorage.getItem(AUTO_REFRESH_KEY) : null;
        const lastAutoMs = lastAutoMsStr ? parseInt(lastAutoMsStr, 10) : 0;

        if (!lastAutoMs || currentNow - lastAutoMs >= AUTO_REFRESH_THROTTLE_MS) {
          autoRefreshDoneRef.current = true;
          if (typeof window !== 'undefined') {
            window.localStorage.setItem(AUTO_REFRESH_KEY, String(currentNow));
          }
          void refresh();
        }
      } catch {
        // Storage access issues safely ignored
      }
    }
  }, [options?.autoRefresh, options?.nowMs, coreState, refresh]);

  if (coreState.state === 'loading') {
    return {
      state: 'loading',
      refreshing,
      refreshError,
      refresh,
    };
  }

  if (coreState.state === 'error') {
    return {
      state: 'error',
      message: coreState.message,
      retry: coreState.retry,
      refreshing,
      refreshError,
      refresh,
    };
  }

  return {
    state: 'ready',
    snapshot: coreState.snapshot,
    source: coreState.source,
    refreshing,
    refreshError,
    refresh,
  };
}
