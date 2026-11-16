/**
 * Abstract key-value storage port for synchronous preferences and cached snapshots.
 */
export interface KeyValueStore {
  get(key: string): string | null;
  set(key: string, value: string): boolean;
  remove(key: string): void;
}

/**
 * In-memory implementation of KeyValueStore for testing and fallback environments.
 */
export function createMemoryStore(): KeyValueStore {
  const store = new Map<string, string>();
  return {
    get(key: string): string | null {
      return store.get(key) ?? null;
    },
    set(key: string, value: string): boolean {
      store.set(key, value);
      return true;
    },
    remove(key: string): void {
      store.delete(key);
    },
  };
}

/**
 * LocalStorage adapter conforming to KeyValueStore.
 * Resilient against missing window.localStorage, browser privacy mode restrictions,
 * and quota exhaustion exceptions (never throws).
 *
 * @param customStorage Optional Storage instance for unit testing
 */
export function createLocalStorageStore(customStorage?: Storage | null): KeyValueStore {
  const resolveStorage = (): Storage | null => {
    if (customStorage !== undefined) return customStorage;
    try {
      if (typeof window !== 'undefined') {
        return window.localStorage;
      }
    } catch {
      // SecurityError / permission denied in restricted iframes or privacy modes
    }
    return null;
  };

  return {
    get(key: string): string | null {
      try {
        const s = resolveStorage();
        return s ? s.getItem(key) : null;
      } catch {
        return null;
      }
    },
    set(key: string, value: string): boolean {
      try {
        const s = resolveStorage();
        if (!s) return false;
        s.setItem(key, value);
        return true;
      } catch {
        // QuotaExceededError or security block
        return false;
      }
    },
    remove(key: string): void {
      try {
        const s = resolveStorage();
        if (s) s.removeItem(key);
      } catch {
        // Ignored
      }
    },
  };
}
