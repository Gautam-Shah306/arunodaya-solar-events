export type DayNightState = 'day' | 'night';

export interface DayNightEndpoints {
  readonly sunriseDisplayMs: number;
  readonly sunsetDisplayMs: number;
}

/**
 * Determines whether the current instant is day or night based on displayed endpoints.
 * Returns 'day' from the displayed sunrise minute up to but excluding the displayed sunset minute.
 * Otherwise returns 'night'.
 * @param nowMs Current epoch instant in milliseconds
 * @param endpoints Displayed sunrise and sunset instants for the day
 */
export function dayNight(nowMs: number, endpoints: DayNightEndpoints): DayNightState {
  if (
    typeof nowMs !== 'number' ||
    typeof endpoints.sunriseDisplayMs !== 'number' ||
    typeof endpoints.sunsetDisplayMs !== 'number' ||
    !Number.isFinite(nowMs) ||
    !Number.isFinite(endpoints.sunriseDisplayMs) ||
    !Number.isFinite(endpoints.sunsetDisplayMs)
  ) {
    throw new RangeError('All instants must be finite numbers');
  }

  if (nowMs >= endpoints.sunriseDisplayMs && nowMs < endpoints.sunsetDisplayMs) {
    return 'day';
  }

  return 'night';
}
