import { describe, expect, it } from 'vitest';
import { serializeThemeChoice } from '@arunodaya/themes';
import {
  DEFAULT_LOCATION,
  DEFAULT_PREFS,
  loadPrefs,
  parsePrefs,
  savePrefs,
  type Prefs,
} from '../src/core/prefs.js';
import { createLocalStorageStore, createMemoryStore } from '../src/core/storage.js';

describe('Storage and Preferences', () => {
  it('memory store returns null for a missing key and stores strings', () => {
    const store = createMemoryStore();
    expect(store.get('missing.key')).toBeNull();

    const ok = store.set('key1', 'value1');
    expect(ok).toBe(true);
    expect(store.get('key1')).toBe('value1');

    store.remove('key1');
    expect(store.get('key1')).toBeNull();
  });

  it('local storage store survives a thrown quota error without crashing', () => {
    const mockStorage: Storage = {
      length: 0,
      clear() {},
      getItem(key: string) {
        if (key === 'throw') throw new Error('SecurityError');
        return null;
      },
      key() {
        return null;
      },
      removeItem(key: string) {
        if (key === 'throw') throw new Error('SecurityError');
      },
      setItem() {
        throw new Error('QuotaExceededError: DOM Exception 22');
      },
    };

    const store = createLocalStorageStore(mockStorage);
    expect(() => store.set('large_key', 'large_value')).not.toThrow();
    const result = store.set('large_key', 'large_value');
    expect(result).toBe(false);
    expect(store.get('throw')).toBeNull();
    expect(() => store.remove('throw')).not.toThrow();
  });

  it('local storage store survives missing storage', () => {
    const store = createLocalStorageStore(null);
    expect(store.get('any.key')).toBeNull();
    expect(store.set('any.key', 'value')).toBe(false);
    expect(() => store.remove('any.key')).not.toThrow();
  });

  it('parsePrefs applies defaults when storage is empty', () => {
    expect(parsePrefs(null)).toEqual(DEFAULT_PREFS);
    expect(parsePrefs('')).toEqual(DEFAULT_PREFS);
  });

  it('parsePrefs falls back per field for invalid values', () => {
    const partialInvalid = JSON.stringify({
      version: 1,
      themeChoice: 'non-existent-theme-id',
      clockFormat: '36h',
      location: {
        lat: 999, // out of range
        lon: 72.8,
        label: '', // empty label
        source: 'satellite', // invalid source
        fixAtMs: -50, // invalid timestamp
      },
    });

    const prefs = parsePrefs(partialInvalid);
    // Invalid theme choice falls back to system choice
    expect(prefs.themeChoice).toBe('system');
    // Invalid clock format falls back to default 12h
    expect(prefs.clockFormat).toBe('12h');
    // Latitude out of bounds falls back to default Rajkot lat
    expect(prefs.location.lat).toBe(DEFAULT_LOCATION.lat);
    // Valid longitude is preserved
    expect(prefs.location.lon).toBe(72.8);
    // Empty label falls back to default Rajkot
    expect(prefs.location.label).toBe(DEFAULT_LOCATION.label);
    // Invalid source falls back to manual
    expect(prefs.location.source).toBe(DEFAULT_LOCATION.source);
    // Negative fixAtMs falls back to 0
    expect(prefs.location.fixAtMs).toBe(0);
  });

  it('parsePrefs never throws on corrupt JSON', () => {
    expect(() => parsePrefs('{ invalid json ...')).not.toThrow();
    expect(parsePrefs('{ invalid json ...')).toEqual(DEFAULT_PREFS);
    expect(parsePrefs('null')).toEqual(DEFAULT_PREFS);
    expect(parsePrefs('123')).toEqual(DEFAULT_PREFS);
  });

  it('prefs round trip preserves theme choice clock format and location', () => {
    const store = createMemoryStore();
    const customPrefs: Prefs = {
      version: 1,
      themeChoice: serializeThemeChoice({ kind: 'theme', id: 'pack-navy' }),
      clockFormat: '24h',
      location: {
        lat: 18.92,
        lon: 72.83,
        label: 'Mumbai',
        source: 'gps',
        fixAtMs: 1763164800000,
      },
    };

    savePrefs(store, customPrefs);
    const loaded = loadPrefs(store);
    expect(loaded).toEqual(customPrefs);
  });
});
