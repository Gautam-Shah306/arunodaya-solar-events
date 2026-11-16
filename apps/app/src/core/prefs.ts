import { parseThemeChoice, serializeThemeChoice } from '@arunodaya/themes';
import type { KeyValueStore } from './storage.js';

export const PREFS_KEY = 'arunodaya.prefs.v1';

/**
 * Temporary default location (Rajkot, Gujarat) used until Prompt 8 introduces
 * interactive geolocation and city search.
 */
export const DEFAULT_LOCATION = {
  lat: 22.3,
  lon: 70.8,
  label: 'Rajkot',
  source: 'manual' as const,
  fixAtMs: 0,
};

export interface PrefsLocation {
  readonly lat: number;
  readonly lon: number;
  readonly label: string;
  readonly source: 'gps' | 'last_known' | 'manual';
  readonly fixAtMs: number;
}

export interface Prefs {
  readonly version: 1;
  readonly themeChoice: string;
  readonly clockFormat: '12h' | '24h';
  readonly location: PrefsLocation;
}

export const DEFAULT_PREFS: Prefs = {
  version: 1,
  themeChoice: serializeThemeChoice({ kind: 'system' }),
  clockFormat: '12h',
  location: DEFAULT_LOCATION,
};

/**
 * Safely parses preferences JSON with per-field fallback. Never throws.
 *
 * @param raw Raw JSON string from storage, or null
 */
export function parsePrefs(raw: string | null): Prefs {
  if (!raw || typeof raw !== 'string') {
    return DEFAULT_PREFS;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return DEFAULT_PREFS;
  }

  if (!parsed || typeof parsed !== 'object') {
    return DEFAULT_PREFS;
  }

  const obj = parsed as Record<string, unknown>;

  // 1. Theme choice
  let themeChoice = DEFAULT_PREFS.themeChoice;
  if (typeof obj.themeChoice === 'string') {
    const choice = parseThemeChoice(obj.themeChoice);
    themeChoice = serializeThemeChoice(choice);
  }

  // 2. Clock format ('12h' | '24h')
  let clockFormat: '12h' | '24h' = DEFAULT_PREFS.clockFormat;
  if (obj.clockFormat === '12h' || obj.clockFormat === '24h') {
    clockFormat = obj.clockFormat;
  }

  // 3. Location
  let location: PrefsLocation = DEFAULT_LOCATION;
  if (obj.location && typeof obj.location === 'object') {
    const loc = obj.location as Record<string, unknown>;

    const lat =
      typeof loc.lat === 'number' && Number.isFinite(loc.lat) && loc.lat >= -90 && loc.lat <= 90
        ? loc.lat
        : DEFAULT_LOCATION.lat;

    const lon =
      typeof loc.lon === 'number' && Number.isFinite(loc.lon) && loc.lon >= -180 && loc.lon <= 180
        ? loc.lon
        : DEFAULT_LOCATION.lon;

    const label =
      typeof loc.label === 'string' && loc.label.trim().length > 0 && loc.label.length <= 80
        ? loc.label.trim()
        : DEFAULT_LOCATION.label;

    const source =
      loc.source === 'gps' || loc.source === 'last_known' || loc.source === 'manual'
        ? loc.source
        : DEFAULT_LOCATION.source;

    const fixAtMs =
      typeof loc.fixAtMs === 'number' && Number.isFinite(loc.fixAtMs) && loc.fixAtMs >= 0
        ? Math.floor(loc.fixAtMs)
        : DEFAULT_LOCATION.fixAtMs;

    location = { lat, lon, label, source, fixAtMs };
  }

  return {
    version: 1,
    themeChoice,
    clockFormat,
    location,
  };
}

/**
 * Loads preferences from the KeyValueStore, applying defaults if missing or corrupt.
 *
 * @param store KeyValueStore instance
 */
export function loadPrefs(store: KeyValueStore): Prefs {
  return parsePrefs(store.get(PREFS_KEY));
}

/**
 * Saves preferences into the KeyValueStore.
 *
 * @param store KeyValueStore instance
 * @param prefs Complete Prefs object
 */
export function savePrefs(store: KeyValueStore, prefs: Prefs): boolean {
  return store.set(PREFS_KEY, JSON.stringify(prefs));
}
