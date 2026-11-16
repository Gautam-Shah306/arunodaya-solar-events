import * as SunCalc from 'suncalc';
import { istDayEndMs, istDayStartMs } from '../ist-day.mjs';

export const id = 'suncalc';
export const version = '2.1.4';

/**
 * Computes astronomical events for a given city and IST date using suncalc.
 *
 * @param {{ lat: number, lon: number }} city
 * @param {string} istDate YYYY-MM-DD
 * @returns {object}
 */
export function computeDay(city, istDate) {
  const dayStart = istDayStartMs(istDate);
  const dayEnd = istDayEndMs(istDate);
  const noonDate = new Date(dayStart + 43_200_000);

  // SunCalc getTimes queries solar events around noonDate
  // To avoid missing events that cross local midnight, query previous, current, and next day noon
  const noonPrev = new Date(dayStart - 43_200_000);
  const noonNext = new Date(dayEnd + 43_200_000);

  const timesList = [
    SunCalc.getTimes(noonPrev, city.lat, city.lon),
    SunCalc.getTimes(noonDate, city.lat, city.lon),
    SunCalc.getTimes(noonNext, city.lat, city.lon),
  ];

  /**
   * @param {(t: Record<string, any>) => any} getter
   * @returns {number | null}
   */
  function findEvent(getter) {
    for (const t of timesList) {
      const d = getter(t);
      if (d && !Number.isNaN(d.getTime())) {
        const ms = d.getTime();
        if (ms >= dayStart && ms < dayEnd) {
          return ms;
        }
      }
    }
    return null;
  }

  const sunrise = findEvent((t) => t.sunrise);
  const sunset = findEvent((t) => t.sunset);
  const solarNoon = findEvent((t) => t.solarNoon);
  const civilDawn = findEvent((t) => t.dawn);
  const civilDusk = findEvent((t) => t.dusk);
  const sun6Morning = findEvent((t) => t.goldenHourEnd);
  const sun6Evening = findEvent((t) => t.goldenHour);

  // Moon events: query previous, current, next day
  const moonDays = [new Date(dayStart - 86_400_000), noonDate, new Date(dayEnd + 3_600_000)];
  const moonrises = new Set();
  const moonsets = new Set();

  for (const mDate of moonDays) {
    try {
      const mTimes = SunCalc.getMoonTimes(mDate, city.lat, city.lon);
      if (mTimes.rise) {
        const ms = mTimes.rise.getTime();
        if (ms >= dayStart && ms < dayEnd) moonrises.add(ms);
      }
      if (mTimes.set) {
        const ms = mTimes.set.getTime();
        if (ms >= dayStart && ms < dayEnd) moonsets.add(ms);
      }
    } catch {
      // ignore
    }
  }

  const moonrise = Array.from(moonrises).sort((a, b) => a - b);
  const moonset = Array.from(moonsets).sort((a, b) => a - b);

  // Moon phase & illumination at 12:00:00 IST
  const illum = SunCalc.getMoonIllumination(noonDate);
  const fraction = Math.round(illum.phase * 1e6) / 1e6;
  const illumination = Math.round(illum.fraction * 1e6) / 1e6;

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
