import { daysFromCivil, err, ok, type Result } from '@arunodaya/contracts';
import {
  type AstroTime,
  Body,
  Illumination,
  MakeTime,
  MoonPhase,
  Observer as AstroObserver,
  SearchAltitude,
  SearchHourAngle,
  SearchRiseSet,
} from 'astronomy-engine';
import { isSupportedIstDate, IST_OFFSET_MS, MS_PER_DAY, parseIstDate } from '../time/ist.js';
import type { AstroDay, AstroError, Observer } from './types.js';

/**
 * Searches for a single astronomical event occurrence within an IST day [dayStart, dayEnd).
 * Handles boundary events by advancing the search if an event occurs before dayStart.
 */
function findDayEvent(
  search: (t: AstroTime) => AstroTime | null,
  dayStart: number,
  dayEnd: number,
  startTime: AstroTime,
): number | null {
  const first = search(startTime);
  if (!first) return null;
  let ms = first.date.getTime();
  if (ms < dayStart) {
    const next = search(MakeTime(new Date(ms + 60_000)));
    if (next) {
      ms = next.date.getTime();
    }
  }
  return ms >= dayStart && ms < dayEnd ? ms : null;
}

/**
 * Pure numeric comparison for sorting instant arrays ascending.
 */
export function sortInstants(a: number, b: number): number {
  return a - b;
}

/**
 * Computes exact astronomical event instants for an observer on a single IST civil date.
 * Ported directly from the benchmark-validated adapter with strict invariant compliance.
 *
 * @param observer Observer coordinates (latitude, longitude, elevation ignored in v1)
 * @param istDate Date string in YYYY-MM-DD format
 * @returns Result with AstroDay on success, or AstroError on failure
 */
export function computeAstroDay(observer: Observer, istDate: string): Result<AstroDay, AstroError> {
  // 1. Observer coordinate validation
  if (
    typeof observer.lat !== 'number' ||
    !Number.isFinite(observer.lat) ||
    observer.lat < -90 ||
    observer.lat > 90 ||
    typeof observer.lon !== 'number' ||
    !Number.isFinite(observer.lon) ||
    observer.lon < -180 ||
    observer.lon > 180
  ) {
    return err({
      code: 'invalid_observer',
      message: `Invalid observer coordinates: lat=${String(observer.lat)}, lon=${String(observer.lon)}`,
    });
  }

  // 2. IST date validation
  const parsedDate = parseIstDate(istDate);
  if (!parsedDate.ok) {
    return err({
      code: 'invalid_date',
      istDate,
      message: `Invalid IST calendar date string: ${istDate} (${parsedDate.error})`,
    });
  }

  if (!isSupportedIstDate(istDate)) {
    return err({
      code: 'unsupported_date',
      istDate,
      message: `IST date outside supported range (2000-2100): ${istDate}`,
    });
  }

  const { year, month, day } = parsedDate.value;
  const dayStart = daysFromCivil(year, month, day) * MS_PER_DAY - IST_OFFSET_MS;
  const dayEnd = dayStart + MS_PER_DAY;

  // Standard sea-level observer (elevation 0 in v1)
  const obs = new AstroObserver(observer.lat, observer.lon, 0);

  // Search window starting 12 hours before dayStart to capture boundary risings
  const startTime = MakeTime(new Date(dayStart - 12 * 3600 * 1000));
  const limitDays = 2.0;

  // 1. Sunrise & Sunset
  const sunrise = findDayEvent(
    (t) => SearchRiseSet(Body.Sun, obs, 1, t, limitDays),
    dayStart,
    dayEnd,
    startTime,
  );
  const sunset = findDayEvent(
    (t) => SearchRiseSet(Body.Sun, obs, -1, t, limitDays),
    dayStart,
    dayEnd,
    startTime,
  );

  // 2. Solar noon (hour angle 0 transit)
  const solarNoon = findDayEvent(
    (t) => SearchHourAngle(Body.Sun, obs, 0, t).time,
    dayStart,
    dayEnd,
    startTime,
  );

  // 3. Civil dawn & dusk (-6 degrees, no refraction)
  const civilDawn = findDayEvent(
    (t) => SearchAltitude(Body.Sun, obs, 1, t, limitDays, -6.0),
    dayStart,
    dayEnd,
    startTime,
  );
  const civilDusk = findDayEvent(
    (t) => SearchAltitude(Body.Sun, obs, -1, t, limitDays, -6.0),
    dayStart,
    dayEnd,
    startTime,
  );

  // 4. Golden hour (+6 degrees)
  const sun6Morning = findDayEvent(
    (t) => SearchAltitude(Body.Sun, obs, 1, t, limitDays, 6.0),
    dayStart,
    dayEnd,
    startTime,
  );
  const sun6Evening = findDayEvent(
    (t) => SearchAltitude(Body.Sun, obs, -1, t, limitDays, 6.0),
    dayStart,
    dayEnd,
    startTime,
  );

  // Verify all required solar events exist
  const events = {
    sunrise,
    sunset,
    solarNoon,
    civilDawn,
    civilDusk,
    sun6Morning,
    sun6Evening,
  };

  for (const [kind, val] of Object.entries(events)) {
    if (val === null) {
      return err({
        code: 'event_missing',
        kind,
        istDate,
        message: `${kind} event physically missing on ${istDate} for observer lat=${String(observer.lat)}`,
      });
    }
  }

  // 5. Moonrise & Moonset: collect all within [dayStart, dayEnd)
  const moonrise: number[] = [];
  const moonset: number[] = [];

  let curMoonRiseTime = startTime;
  for (let iter = 0; iter < 5; iter++) {
    const t = SearchRiseSet(Body.Moon, obs, 1, curMoonRiseTime, 1.5);
    if (!t) break;
    const ms = t.date.getTime();
    if (ms >= dayEnd) break;
    if (ms >= dayStart) moonrise.push(ms);
    curMoonRiseTime = MakeTime(new Date(ms + 60_000));
  }

  let curMoonSetTime = startTime;
  for (let iter = 0; iter < 5; iter++) {
    const t = SearchRiseSet(Body.Moon, obs, -1, curMoonSetTime, 1.5);
    if (!t) break;
    const ms = t.date.getTime();
    if (ms >= dayEnd) break;
    if (ms >= dayStart) moonset.push(ms);
    curMoonSetTime = MakeTime(new Date(ms + 60_000));
  }

  moonrise.sort(sortInstants);
  moonset.sort(sortInstants);

  // 6. Moon phase at 12:00:00 IST
  const noonAstroTime = MakeTime(new Date(dayStart + 43_200_000));
  const phaseDeg = MoonPhase(noonAstroTime);
  let fraction = Math.round(((phaseDeg % 360) / 360) * 1e6) / 1e6;
  if (fraction >= 1 || fraction < 0) {
    fraction = 0;
  }
  const illumInfo = Illumination(Body.Moon, noonAstroTime);
  const rawIllum = illumInfo.phase_fraction;
  const illumination = Math.round(Math.max(0, Math.min(1, rawIllum)) * 1e6) / 1e6;

  return ok({
    istDate,
    sunrise: Number(sunrise),
    sunset: Number(sunset),
    solarNoon: Number(solarNoon),
    civilDawn: Number(civilDawn),
    civilDusk: Number(civilDusk),
    sun6Morning: Number(sun6Morning),
    sun6Evening: Number(sun6Evening),
    moonrise,
    moonset,
    moonPhase: { fraction, illumination },
  });
}
