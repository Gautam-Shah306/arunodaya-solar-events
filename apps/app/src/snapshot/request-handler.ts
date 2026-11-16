import { buildSnapshot } from '@arunodaya/engine/astro';
import { isBuildRequest, type BuildResponse } from './worker-protocol.js';

/**
 * Handles incoming worker messages.
 * Returns null for foreign messages not intended for the snapshot worker.
 * Returns a BuildResponse with ok: false for malformed or failed build requests.
 * Guaranteed never to throw.
 *
 * @param data Arbitrary message payload
 */
export function handleMessage(data: unknown): BuildResponse | null {
  try {
    if (!data || typeof data !== 'object') {
      return null;
    }

    const obj = data as Record<string, unknown>;
    if (obj.type !== 'build') {
      return null; // Foreign message ignored
    }

    const id = typeof obj.id === 'number' && Number.isInteger(obj.id) ? obj.id : 0;

    if (!isBuildRequest(data)) {
      return {
        id,
        ok: false,
        error: {
          code: 'INVALID_BUILD_REQUEST',
          message: 'Build request payload is malformed or missing required fields',
        },
      };
    }

    const res = buildSnapshot({
      location: data.location,
      startIstDate: data.startIstDate,
      dayCount: data.dayCount,
      generatedAtMs: data.generatedAtMs,
    });

    if (!res.ok) {
      const message =
        'message' in res.error
          ? res.error.message
          : `Snapshot validation failed with ${String(res.error.issues.length)} issues`;
      return {
        id: data.id,
        ok: false,
        error: {
          code: res.error.code,
          message,
        },
      };
    }

    return {
      id: data.id,
      ok: true,
      snapshot: res.value,
    };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    const id =
      data && typeof data === 'object' && 'id' in data && typeof data.id === 'number' ? data.id : 0;

    return {
      id,
      ok: false,
      error: {
        code: 'UNEXPECTED_WORKER_ERROR',
        message: errorMsg,
      },
    };
  }
}
