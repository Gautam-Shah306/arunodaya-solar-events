import { err, ok, type Result, type SnapshotV1 } from '@arunodaya/contracts';
import type { BuildRequest, BuildResponse } from './worker-protocol.js';

export interface WorkerLike {
  postMessage(message: unknown): void;
  addEventListener(type: 'message', listener: (event: { data: unknown }) => void): void;
  addEventListener(type: 'error', listener: (event: { message?: string }) => void): void;
  removeEventListener?(type: string, listener: (event: unknown) => void): void;
  terminate(): void;
}

export interface SnapshotClientError {
  readonly code: string;
  readonly message: string;
}

export interface SnapshotClientOptions {
  readonly createWorker?: () => WorkerLike | null;
  readonly fallback?:
    ((req: BuildRequest) => Promise<BuildResponse | null> | BuildResponse | null) | null;
  readonly timeoutMs?: number;
}

export interface SnapshotClientDiagnostics {
  fallbackCount: number;
  totalRequests: number;
}

export interface SnapshotClient {
  build(
    requestParams: Omit<BuildRequest, 'id' | 'type'>,
  ): Promise<Result<SnapshotV1, SnapshotClientError>>;
  dispose(): void;
  getDiagnostics(): Readonly<SnapshotClientDiagnostics>;
}

/**
 * Creates a SnapshotClient managing background Web Worker execution with
 * asynchronous main-thread fallback, request ID routing, and timeout guards.
 */
export function createSnapshotClient(options: SnapshotClientOptions = {}): SnapshotClient {
  const { createWorker, fallback, timeoutMs = 30_000 } = options;

  let nextId = 1;
  let isDisposed = false;
  const pending = new Map<
    number,
    {
      resolve: (res: Result<SnapshotV1, SnapshotClientError>) => void;
      timer: ReturnType<typeof setTimeout>;
    }
  >();

  const diagnostics: SnapshotClientDiagnostics = {
    fallbackCount: 0,
    totalRequests: 0,
  };

  let worker: WorkerLike | null = null;
  let workerFailed = false;

  async function executeFallback(req: BuildRequest): Promise<BuildResponse | null> {
    if (fallback === null) {
      return null;
    }
    if (typeof fallback === 'function') {
      return await fallback(req);
    }
    try {
      const { handleMessage } = await import('./request-handler.js');
      return handleMessage(req);
    } catch {
      return null;
    }
  }

  function initWorker(): WorkerLike | null {
    if (workerFailed || isDisposed) return null;
    if (worker) return worker;

    try {
      if (createWorker) {
        worker = createWorker();
      } else if (typeof Worker !== 'undefined') {
        worker = new Worker(new URL('./snapshot.worker.ts', import.meta.url), {
          type: 'module',
        });
      }
    } catch {
      workerFailed = true;
      worker = null;
    }

    if (!worker) {
      workerFailed = true;
      return null;
    }

    worker.addEventListener('message', (event: { data: unknown }) => {
      const resp = event.data as BuildResponse | null;
      if (!resp || typeof resp !== 'object' || typeof resp.id !== 'number') {
        return;
      }
      const entry = pending.get(resp.id);
      if (entry) {
        clearTimeout(entry.timer);
        pending.delete(resp.id);
        if (resp.ok) {
          entry.resolve(ok(resp.snapshot));
        } else {
          entry.resolve(err(resp.error));
        }
      }
    });

    worker.addEventListener('error', (event) => {
      const msg =
        typeof event.message === 'string' ? event.message : 'Worker encountered an unhandled error';

      for (const [id, entry] of pending.entries()) {
        clearTimeout(entry.timer);
        entry.resolve(err({ code: 'WORKER_ERROR', message: msg }));
        pending.delete(id);
      }
    });

    return worker;
  }

  return {
    async build(
      requestParams: Omit<BuildRequest, 'id' | 'type'>,
    ): Promise<Result<SnapshotV1, SnapshotClientError>> {
      if (isDisposed) {
        return err({ code: 'DISPOSED', message: 'Snapshot client has been disposed' });
      }

      diagnostics.totalRequests += 1;
      const id = nextId++;
      const fullRequest: BuildRequest = {
        ...requestParams,
        id,
        type: 'build',
      };

      const activeWorker = initWorker();
      if (!activeWorker) {
        diagnostics.fallbackCount += 1;
        const fallbackResp = await executeFallback(fullRequest);
        if (!fallbackResp || !fallbackResp.ok) {
          return err({
            code: fallbackResp ? fallbackResp.error.code : 'FALLBACK_FAILED',
            message: fallbackResp
              ? fallbackResp.error.message
              : 'Main-thread fallback calculation failed',
          });
        }
        return ok(fallbackResp.snapshot);
      }

      return new Promise<Result<SnapshotV1, SnapshotClientError>>((resolve) => {
        const timer = setTimeout(() => {
          void (async () => {
            if (pending.has(id)) {
              pending.delete(id);
              if (worker) {
                worker.terminate();
                worker = null;
              }
              diagnostics.fallbackCount += 1;
              const fb = await executeFallback(fullRequest);
              if (fb && fb.ok) {
                resolve(ok(fb.snapshot));
                return;
              }
              resolve(
                err({
                  code: 'TIMEOUT',
                  message:
                    'Snapshot request ' +
                    String(id) +
                    ' timed out after ' +
                    String(timeoutMs) +
                    ' ms',
                }),
              );
            }
          })();
        }, timeoutMs);

        pending.set(id, { resolve, timer });
        activeWorker.postMessage(fullRequest);
      });
    },

    dispose(): void {
      isDisposed = true;
      for (const [, entry] of pending.entries()) {
        clearTimeout(entry.timer);
        entry.resolve(err({ code: 'TERMINATED', message: 'Snapshot client was disposed' }));
      }
      pending.clear();
      if (worker) {
        worker.terminate();
        worker = null;
      }
    },

    getDiagnostics(): Readonly<SnapshotClientDiagnostics> {
      return { ...diagnostics };
    },
  };
}
