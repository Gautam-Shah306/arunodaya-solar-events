import {
  err,
  migrateSnapshot,
  ok,
  type Result,
  type SnapshotLocation,
  type SnapshotV1,
} from '@arunodaya/contracts';
import { getSnapshotStatus, planSnapshotWindow, type Clock } from '@arunodaya/engine';
import type { KeyValueStore } from '../core/storage.js';
import type { SnapshotClient } from './client.js';

export const SNAPSHOT_STORE_KEY = 'arunodaya.snapshot.v1';

export interface SnapshotServiceResult {
  readonly snapshot: SnapshotV1;
  readonly source: 'cache' | 'built';
}

export interface SnapshotServiceError {
  readonly code: string;
  readonly message: string;
}

export interface SnapshotServiceOptions {
  readonly store: KeyValueStore;
  readonly client: SnapshotClient;
  readonly clock: Clock;
}

export interface SnapshotService {
  load(location: SnapshotLocation): Promise<Result<SnapshotServiceResult, SnapshotServiceError>>;
}

/**
 * Creates the snapshot service orchestrating caching, migration,
 * location invalidation, and background worker calculation.
 */
export function createSnapshotService(options: SnapshotServiceOptions): SnapshotService {
  const { store, client, clock } = options;

  return {
    async load(
      location: SnapshotLocation,
    ): Promise<Result<SnapshotServiceResult, SnapshotServiceError>> {
      const nowMs = typeof clock.now === 'function' ? clock.now() : clock.nowMs();

      // 1. Attempt reading cached snapshot
      const cachedRaw = store.get(SNAPSHOT_STORE_KEY);
      if (cachedRaw) {
        try {
          const parsed: unknown = JSON.parse(cachedRaw);
          const migrated = migrateSnapshot(parsed);
          if (migrated.ok) {
            const cachedSnap = migrated.value;
            const sameLat = Math.abs(cachedSnap.location.lat - location.lat) < 1e-6;
            const sameLon = Math.abs(cachedSnap.location.lon - location.lon) < 1e-6;
            const sameLabel = cachedSnap.location.label === location.label;
            const status = getSnapshotStatus(cachedSnap, nowMs);

            if (sameLat && sameLon && sameLabel && status === 'ready') {
              return ok({
                snapshot: cachedSnap,
                source: 'cache',
              });
            }
          }
        } catch {
          // Corrupt cache silently ignored; triggers fresh build
        }
      }

      // 2. Build fresh snapshot via client
      const windowPlan = planSnapshotWindow(nowMs);
      const buildResult = await client.build({
        location,
        startIstDate: windowPlan.startIstDate,
        dayCount: windowPlan.dayCount,
        generatedAtMs: nowMs,
      });

      if (!buildResult.ok) {
        return err({
          code: buildResult.error.code,
          message: buildResult.error.message,
        });
      }

      // 3. Save successfully built snapshot to store
      store.set(SNAPSHOT_STORE_KEY, JSON.stringify(buildResult.value));

      return ok({
        snapshot: buildResult.value,
        source: 'built',
      });
    },
  };
}
