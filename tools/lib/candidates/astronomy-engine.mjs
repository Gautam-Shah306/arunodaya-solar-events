import {
  Body,
  Illumination,
  MakeTime,
  MoonPhase,
  Observer,
  SearchAltitude,
  SearchHourAngle,
  SearchRiseSet,
} from 'astronomy-engine';
import { istDayEndMs, istDayStartMs } from '../ist-day.mjs';

export const id = 'astronomy-engine';
export const version = '2.1.19';

/**
 * Computes astronomical events for a given city and IST date using astronomy-engine.
 * Standard sea-level observer (elevation 0); 34' atmospheric refraction.
 *
 * @param {{ lat: number, lon: number }} city
 * @param {string} istDate YYYY-MM-DD
 * @returns {object}
 */
export function computeDay(city, istDate) {
  const dayStart = istDayStartMs(istDate);
  const dayEnd = istDayEndMs(istDate);
  const observer = new Observer(city.lat, city.lon, 0);

  // Search window starting 12h before dayStart
  const startTime = MakeTime(new Date(dayStart - 12 * 3600 * 1000));
  const limitDays = 2.0;

  // 1. Sunrise & Sunset (SearchRiseSet includes 34' refraction and limb semidiameter by default)
  let sunrise = null;
  let sunset = null;

  const tRise = SearchRiseSet(Body.Sun, observer, +1, startTime, limitDays);
  if (tRise) {
    let ms = tRise.date.getTime();
    if (ms < dayStart) {
      const next = SearchRiseSet(
        Body.Sun,
        observer,
        +1,
        MakeTime(new Date(ms + 60_000)),
        limitDays,
      );
      if (next) ms = next.date.getTime();
    }
    if (ms >= dayStart && ms < dayEnd) {
      sunrise = ms;
    }
  }

  const tSet = SearchRiseSet(Body.Sun, observer, -1, startTime, limitDays);
  if (tSet) {
    let ms = tSet.date.getTime();
    if (ms < dayStart) {
      const next = SearchRiseSet(
        Body.Sun,
        observer,
        -1,
        MakeTime(new Date(ms + 60_000)),
        limitDays,
      );
      if (next) ms = next.date.getTime();
    }
    if (ms >= dayStart && ms < dayEnd) {
      sunset = ms;
    }
  }

  // 2. Solar noon (hour angle 0 transit)
  let solarNoon = null;
  const tNoon = SearchHourAngle(Body.Sun, observer, 0, startTime);
  if (tNoon && tNoon.time) {
    let ms = tNoon.time.date.getTime();
    if (ms < dayStart) {
      const next = SearchHourAngle(Body.Sun, observer, 0, MakeTime(new Date(ms + 60_000)));
      if (next && next.time) ms = next.time.date.getTime();
    }
    if (ms >= dayStart && ms < dayEnd) {
      solarNoon = ms;
    }
  }

  // 3. Civil dawn & dusk (-6 degrees, no refraction)
  let civilDawn = null;
  let civilDusk = null;

  const tDawn = SearchAltitude(Body.Sun, observer, +1, startTime, limitDays, -6.0);
  if (tDawn) {
    let ms = tDawn.date.getTime();
    if (ms < dayStart) {
      const next = SearchAltitude(
        Body.Sun,
        observer,
        +1,
        MakeTime(new Date(ms + 60_000)),
        limitDays,
        -6.0,
      );
      if (next) ms = next.date.getTime();
    }
    if (ms >= dayStart && ms < dayEnd) {
      civilDawn = ms;
    }
  }

  const tDusk = SearchAltitude(Body.Sun, observer, -1, startTime, limitDays, -6.0);
  if (tDusk) {
    let ms = tDusk.date.getTime();
    if (ms < dayStart) {
      const next = SearchAltitude(
        Body.Sun,
        observer,
        -1,
        MakeTime(new Date(ms + 60_000)),
        limitDays,
        -6.0,
      );
      if (next) ms = next.date.getTime();
    }
    if (ms >= dayStart && ms < dayEnd) {
      civilDusk = ms;
    }
  }

  // 4. Golden hour (+6 degrees)
  let sun6Morning = null;
  let sun6Evening = null;

  const tG1 = SearchAltitude(Body.Sun, observer, +1, startTime, limitDays, 6.0);
  if (tG1) {
    let ms = tG1.date.getTime();
    if (ms < dayStart) {
      const next = SearchAltitude(
        Body.Sun,
        observer,
        +1,
        MakeTime(new Date(ms + 60_000)),
        limitDays,
        6.0,
      );
      if (next) ms = next.date.getTime();
    }
    if (ms >= dayStart && ms < dayEnd) {
      sun6Morning = ms;
    }
  }

  const tG2 = SearchAltitude(Body.Sun, observer, -1, startTime, limitDays, 6.0);
  if (tG2) {
    let ms = tG2.date.getTime();
    if (ms < dayStart) {
      const next = SearchAltitude(
        Body.Sun,
        observer,
        -1,
        MakeTime(new Date(ms + 60_000)),
        limitDays,
        6.0,
      );
      if (next) ms = next.date.getTime();
    }
    if (ms >= dayStart && ms < dayEnd) {
      sun6Evening = ms;
    }
  }

  // 5. Moonrise & Moonset: collect all within [dayStart, dayEnd)
  const moonrise = [];
  const moonset = [];

  let curMoonRiseTime = startTime;
  for (let iter = 0; iter < 4; iter++) {
    const t = SearchRiseSet(Body.Moon, observer, +1, curMoonRiseTime, 1.5);
    if (!t) break;
    const ms = t.date.getTime();
    if (ms >= dayEnd) break;
    if (ms >= dayStart) moonrise.push(ms);
    curMoonRiseTime = MakeTime(new Date(ms + 60_000));
  }

  let curMoonSetTime = startTime;
  for (let iter = 0; iter < 4; iter++) {
    const t = SearchRiseSet(Body.Moon, observer, -1, curMoonSetTime, 1.5);
    if (!t) break;
    const ms = t.date.getTime();
    if (ms >= dayEnd) break;
    if (ms >= dayStart) moonset.push(ms);
    curMoonSetTime = MakeTime(new Date(ms + 60_000));
  }

  moonrise.sort((a, b) => a - b);
  moonset.sort((a, b) => a - b);

  // 6. Moon phase at 12:00:00 IST
  const noonAstroTime = MakeTime(new Date(dayStart + 43_200_000));
  const phaseDeg = MoonPhase(noonAstroTime);
  const fraction = Math.round(((phaseDeg % 360) / 360) * 1e6) / 1e6;
  const illumInfo = Illumination(Body.Moon, noonAstroTime);
  const illumination = Math.round(illumInfo.phase_fraction * 1e6) / 1e6;

  return {
    sunrise,
    sunset,
    solarNoon,
    civilDawn,
    civilDusk,
    sun6Morning,
    sun6Evening,
    moonrise,
    moonset,
    moonPhase: { fraction, illumination },
  };
}
