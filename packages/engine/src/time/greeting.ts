import { GREETING } from '../config.js';
import { istDayStartMs, MS_PER_MINUTE } from './ist.js';

export type Greeting = 'morning' | 'afternoon' | 'evening' | 'night';

export interface SolarAnchors {
  readonly solarNoonMs: number;
  readonly sunsetMs: number;
}

export interface GreetingOptions {
  readonly eveningStartsAtEarlierOfFixedAndSunset?: boolean;
}

/**
 * Selects language-neutral greeting key based on current instant and solar anchors for the day.
 * - 'morning': From 04:00 IST up to solar noon
 * - 'afternoon': From solar noon up to evening start
 * - 'evening': From evening start up to sunset + 180 minutes (3 hours)
 * - 'night': From evening end until next 04:00 IST (and 00:00 to 04:00 IST)
 *
 * Evening start is 17:00 IST or the earlier of 17:00 IST and sunset when enabled (Proposed default: true).
 * @param nowMs Current instant in epoch milliseconds
 * @param anchors Solar noon and sunset instants for the IST date of nowMs
 * @param options Optional configuration overrides
 */
export function selectGreeting(
  nowMs: number,
  anchors: SolarAnchors,
  options?: GreetingOptions,
): Greeting {
  if (
    typeof nowMs !== 'number' ||
    typeof anchors.solarNoonMs !== 'number' ||
    typeof anchors.sunsetMs !== 'number' ||
    !Number.isFinite(nowMs) ||
    !Number.isFinite(anchors.solarNoonMs) ||
    !Number.isFinite(anchors.sunsetMs)
  ) {
    throw new RangeError('All instants must be finite numbers');
  }

  const dayStartMs = istDayStartMs(nowMs);
  const morningStartMs = dayStartMs + GREETING.morningStartMinuteOfDay * MS_PER_MINUTE;

  if (nowMs < morningStartMs) {
    return 'night';
  }

  if (nowMs < anchors.solarNoonMs) {
    return 'morning';
  }

  const useEarlierOf =
    options?.eveningStartsAtEarlierOfFixedAndSunset ??
    GREETING.eveningStartsAtEarlierOfFixedAndSunset;

  const fixedEveningStartMs = dayStartMs + GREETING.fixedEveningStartMinuteOfDay * MS_PER_MINUTE;
  const eveningStartMs = useEarlierOf
    ? Math.min(fixedEveningStartMs, anchors.sunsetMs)
    : fixedEveningStartMs;

  if (nowMs < eveningStartMs) {
    return 'afternoon';
  }

  const eveningEndMs = anchors.sunsetMs + GREETING.eveningLengthAfterSunsetMinutes * MS_PER_MINUTE;

  if (nowMs < eveningEndMs) {
    return 'evening';
  }

  return 'night';
}
