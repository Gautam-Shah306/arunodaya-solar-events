import type { Ev } from '@arunodaya/contracts';
import { NAVKARSHI_OFFSET_MINUTES } from '../config.js';
import { MS_PER_MINUTE } from './ist.js';

export type RoundingKind = 'start' | 'end' | 'nearest';

const NAVKARSHI_OFFSET_MS = NAVKARSHI_OFFSET_MINUTES * MS_PER_MINUTE;

/**
 * Rounds an exact epoch millisecond instant to a whole minute boundary.
 * - 'start': Ceil to the next whole minute (start-type events, e.g. sunrise, civil dawn, navkarshi, moonrise).
 * - 'end': Floor to the previous whole minute (end-type events, e.g. sunset, civil dusk, moonset).
 * - 'nearest': Round half up to nearest minute.
 * If the exact instant is already an exact whole minute, it is unchanged.
 * @param kind Rounding mode ('start' | 'end' | 'nearest')
 * @param exactMs Exact epoch milliseconds
 */
export function displayRound(kind: RoundingKind, exactMs: number): number {
  if (typeof exactMs !== 'number' || !Number.isFinite(exactMs) || !Number.isInteger(exactMs)) {
    throw new RangeError(`exactMs must be a finite integer, got: ${String(exactMs)}`);
  }

  const minuteFraction = exactMs / MS_PER_MINUTE;

  switch (kind) {
    case 'start':
      return Math.ceil(minuteFraction) * MS_PER_MINUTE;
    case 'end':
      return Math.floor(minuteFraction) * MS_PER_MINUTE;
    case 'nearest':
      return Math.floor(minuteFraction + 0.5) * MS_PER_MINUTE;
  }
}

/**
 * Creates an Ev structure with exact and displayed instants.
 * @param kind Rounding mode
 * @param exactMs Exact epoch milliseconds
 */
export function makeEvent(kind: RoundingKind, exactMs: number): Ev {
  return {
    exactMs,
    displayMs: displayRound(kind, exactMs),
  };
}

/**
 * Derives the Navkarshi event from exact sunrise.
 * Navkarshi exact is exact sunrise + strictly 48 minutes (2880000 ms), then ceiled to the minute.
 * Never derived from rounded sunrise.
 * @param sunriseExactMs Exact sunrise instant in epoch milliseconds
 */
export function makeNavkarshi(sunriseExactMs: number): Ev {
  const exactNavkarshiMs = sunriseExactMs + NAVKARSHI_OFFSET_MS;
  return {
    exactMs: exactNavkarshiMs,
    displayMs: displayRound('start', exactNavkarshiMs),
  };
}

/**
 * Computes daylight duration in whole minutes from DISPLAYED sunrise and sunset endpoints.
 * Returns 0 when displayed sunset is not after displayed sunrise (e.g. polar night).
 * @param sunriseDisplayMs Displayed sunrise instant
 * @param sunsetDisplayMs Displayed sunset instant
 */
export function daylightMinutes(sunriseDisplayMs: number, sunsetDisplayMs: number): number {
  if (
    typeof sunriseDisplayMs !== 'number' ||
    typeof sunsetDisplayMs !== 'number' ||
    !Number.isFinite(sunriseDisplayMs) ||
    !Number.isFinite(sunsetDisplayMs)
  ) {
    throw new RangeError('Endpoints must be finite numbers');
  }

  if (sunsetDisplayMs <= sunriseDisplayMs) {
    return 0;
  }

  return Math.round((sunsetDisplayMs - sunriseDisplayMs) / MS_PER_MINUTE);
}
