import { handleMessage } from './request-handler.js';

interface DedicatedWorkerGlobalScopeLike {
  postMessage(message: unknown): void;
  addEventListener(type: 'message', listener: (event: { data: unknown }) => void): void;
}

const workerScope = globalThis as unknown as DedicatedWorkerGlobalScopeLike;

if (typeof workerScope.addEventListener === 'function') {
  workerScope.addEventListener('message', (event: { data: unknown }) => {
    const response = handleMessage(event.data);
    if (response) {
      workerScope.postMessage(response);
    }
  });
}
