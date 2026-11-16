import { type DayRecord, type MoonEvent, type Result, ok } from '@arunodaya/contracts';
import { makeEvent, makeNavkarshi } from '../time/rounding.js';
import { computeAstroDay } from './astro-day.js';
import type { AstroDay, AstroError, Observer } from './types.js';

/**
 * Converts an exact astronomical day calculation into a snapshot DayRecord.
 * Implements the display rounding conventions specified in section 3.3 of the spec:
 * - sunrise: start-type rounding (ceiling to next whole minute)
 * - navkarshi: derived strictly from exact sunrise (+48 min, ceiling to next whole minute)
 * - sunset: end-type rounding (floor to whole minute)
 * - civilDawn: start-type rounding
 * - civilDusk: end-type rounding
 * - goldenMorning: starts at sunrise Ev, ends at end-rounded +6 deg sun altitude
 * - goldenEvening: starts at start-rounded +6 deg sun altitude, ends at sunset Ev
 * - solarNoonMs: exact instant in epoch milliseconds
 * - moonPhaseAtNoon: phase fraction and illumination at 12:00 IST
 *
 * @param astroDay Exact astronomical day calculation result
 * @returns Standard snapshot DayRecord
 */
export function toDayRecord(astroDay: AstroDay): DayRecord {
  const sunrise = makeEvent('start', astroDay.sunrise);
  const navkarshi = makeNavkarshi(astroDay.sunrise);
  const sunset = makeEvent('end', astroDay.sunset);
  const civilDawn = makeEvent('start', astroDay.civilDawn);
  const civilDusk = makeEvent('end', astroDay.civilDusk);

  const goldenMorning = {
    start: sunrise,
    end: makeEvent('end', astroDay.sun6Morning),
  };

  const goldenEvening = {
    start: makeEvent('start', astroDay.sun6Evening),
    end: sunset,
  };

  return {
    istDate: astroDay.istDate,
    sunrise,
    navkarshi,
    sunset,
    civilDawn,
    civilDusk,
    solarNoonMs: astroDay.solarNoon,
    goldenMorning,
    goldenEvening,
    moonPhaseAtNoon: {
      phase: astroDay.moonPhase.fraction,
      illumination: astroDay.moonPhase.illumination,
    },
  };
}

/**
 * Computes a single DayRecord for an observer on a given IST date.
 *
 * @param observer Geographic coordinates of observer
 * @param istDate Calendar date in YYYY-MM-DD format
 * @returns Result with DayRecord or AstroError
 */
export function computeDayRecord(
  observer: Observer,
  istDate: string,
): Result<DayRecord, AstroError> {
  const astroRes = computeAstroDay(observer, istDate);
  if (!astroRes.ok) {
    return astroRes;
  }
  return ok(toDayRecord(astroRes.value));
}

/**
 * Computes all lunar rise and set events occurring on an IST date, sorted chronologically.
 * Moonrise events use start-type rounding; moonset events use end-type rounding.
 *
 * @param observer Geographic coordinates of observer
 * @param istDate Calendar date in YYYY-MM-DD format
 * @returns Result with array of MoonEvent or AstroError
 */
export function computeMoonEvents(
  observer: Observer,
  istDate: string,
): Result<MoonEvent[], AstroError> {
  const astroRes = computeAstroDay(observer, istDate);
  if (!astroRes.ok) {
    return astroRes;
  }
  const astroDay = astroRes.value;
  const events: MoonEvent[] = [];

  for (const riseMs of astroDay.moonrise) {
    events.push({
      kind: 'rise',
      ev: makeEvent('start', riseMs),
    });
  }

  for (const setMs of astroDay.moonset) {
    events.push({
      kind: 'set',
      ev: makeEvent('end', setMs),
    });
  }

  events.sort((a, b) => a.ev.displayMs - b.ev.displayMs);
  return ok(events);
}
