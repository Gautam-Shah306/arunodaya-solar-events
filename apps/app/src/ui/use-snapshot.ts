import { useCallback, useEffect, useState } from 'react';
import type { SnapshotLocation, SnapshotV1 } from '@arunodaya/contracts';
import type { SnapshotService } from '../snapshot/service.js';

export type SnapshotState =
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
    };

/**
 * Hook loading and managing snapshot state for a given location.
 */
export function useSnapshot(service: SnapshotService, location: SnapshotLocation): SnapshotState {
  const [state, setState] = useState<SnapshotState>({ state: 'loading' });
  const [retryCount, setRetryCount] = useState(0);

  const retry = useCallback(() => {
    setState({ state: 'loading' });
    setRetryCount((c) => c + 1);
  }, []);

  useEffect(() => {
    let canceled = false;
    setState({ state: 'loading' });

    void service.load(location).then((result) => {
      if (canceled) return;
      if (result.ok) {
        setState({
          state: 'ready',
          snapshot: result.value.snapshot,
          source: result.value.source,
        });
      } else {
        setState({
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

  return state;
}
