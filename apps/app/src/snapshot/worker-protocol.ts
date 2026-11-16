import type { SnapshotLocation, SnapshotV1 } from '@arunodaya/contracts';

export interface BuildRequest {
  readonly id: number;
  readonly type: 'build';
  readonly location: SnapshotLocation;
  readonly startIstDate: string;
  readonly dayCount: number;
  readonly generatedAtMs: number;
}

export type BuildResponse =
  | {
      readonly id: number;
      readonly ok: true;
      readonly snapshot: SnapshotV1;
    }
  | {
      readonly id: number;
      readonly ok: false;
      readonly error: {
        readonly code: string;
        readonly message: string;
      };
    };

/**
 * Type guard verifying whether an incoming message is a valid BuildRequest.
 *
 * @param data Arbitrary message payload
 */
export function isBuildRequest(data: unknown): data is BuildRequest {
  if (!data || typeof data !== 'object') {
    return false;
  }
  const req = data as Record<string, unknown>;
  return (
    typeof req.id === 'number' &&
    Number.isInteger(req.id) &&
    req.type === 'build' &&
    typeof req.startIstDate === 'string' &&
    typeof req.dayCount === 'number' &&
    typeof req.generatedAtMs === 'number' &&
    req.location !== null &&
    typeof req.location === 'object'
  );
}
