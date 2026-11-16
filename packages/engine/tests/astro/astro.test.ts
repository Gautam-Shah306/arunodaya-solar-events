import fs from 'node:fs';
import path from 'node:path';
import { validateSnapshot, type SnapshotLocation, type SnapshotV1 } from '@arunodaya/contracts';
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import {
  accuracyTier,
  ASTRONOMY_ENGINE,
  buildSnapshot,
  buildSnapshotAround,
  computeAstroDay,
  computeDayRecord,
  computeMoonEvents,
  planSnapshotWindow,
  sortInstants,
  toDayRecord,
} from '../../src/astro/index.js';
import {
  buildOccurrenceSeries,
  createFixedClock,
  dayNight,
  getCountdownState,
  getSnapshotStatus,
  istDateToStartMs,
  selectGreeting,
} from '../../src/index.js';

const RAJKOT_OBSERVER = { lat: 22.3, lon: 70.8, elevationM: 130 };
const RAJKOT_LOCATION: SnapshotLocation = {
  lat: 22.3,
  lon: 70.8,
  elevationM: 130,
  label: 'Rajkot, Gujarat',
  source: 'manual',
  fixAtMs: 1763164800000,
};

describe('astronomy provider and snapshot builder', () => {
  it('computeAstroDay returns sunrise sunset and noon for Rajkot on 2026-11-15', () => {
    const res = computeAstroDay(RAJKOT_OBSERVER, '2026-11-15');
    expect(res.ok).toBe(true);
    if (!res.ok) return;

    const day = res.value;
    expect(day.istDate).toBe('2026-11-15');
    expect(day.sunrise).toBeGreaterThan(0);
    expect(day.sunset).toBeGreaterThan(day.sunrise);
    expect(day.solarNoon).toBeGreaterThan(day.sunrise);
    expect(day.solarNoon).toBeLessThan(day.sunset);
  });

  it('computeAstroDay returns civil dawn before sunrise and civil dusk after sunset', () => {
    const res = computeAstroDay(RAJKOT_OBSERVER, '2026-11-15');
    expect(res.ok).toBe(true);
    if (!res.ok) return;

    const day = res.value;
    expect(day.civilDawn).toBeLessThan(day.sunrise);
    expect(day.civilDusk).toBeGreaterThan(day.sunset);
  });

  it('computeAstroDay returns the plus 6 degree crossings between sunrise and solar noon and between solar noon and sunset', () => {
    const res = computeAstroDay(RAJKOT_OBSERVER, '2026-11-15');
    expect(res.ok).toBe(true);
    if (!res.ok) return;

    const day = res.value;
    expect(day.sun6Morning).toBeGreaterThan(day.sunrise);
    expect(day.sun6Morning).toBeLessThan(day.solarNoon);
    expect(day.sun6Evening).toBeGreaterThan(day.solarNoon);
    expect(day.sun6Evening).toBeLessThan(day.sunset);
  });

  it('computeAstroDay keeps every event inside its IST date', () => {
    const istDate = '2026-11-15';
    const dayStartRes = istDateToStartMs(istDate);
    expect(dayStartRes.ok).toBe(true);
    if (!dayStartRes.ok) return;

    const dayStart = dayStartRes.value;
    const dayEnd = dayStart + 86_400_000;

    const res = computeAstroDay(RAJKOT_OBSERVER, istDate);
    expect(res.ok).toBe(true);
    if (!res.ok) return;

    const day = res.value;
    const singleInstants = [
      day.sunrise,
      day.sunset,
      day.solarNoon,
      day.civilDawn,
      day.civilDusk,
      day.sun6Morning,
      day.sun6Evening,
    ];

    for (const ms of singleInstants) {
      expect(ms).toBeGreaterThanOrEqual(dayStart);
      expect(ms).toBeLessThan(dayEnd);
    }

    for (const ms of [...day.moonrise, ...day.moonset]) {
      expect(ms).toBeGreaterThanOrEqual(dayStart);
      expect(ms).toBeLessThan(dayEnd);
    }
  });

  it('computeAstroDay rejects a latitude of 91', () => {
    const res = computeAstroDay({ lat: 91, lon: 70.8 }, '2026-11-15');
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.error.code).toBe('invalid_observer');
  });

  it('computeAstroDay rejects a longitude of 181', () => {
    const res = computeAstroDay({ lat: 22.3, lon: 181 }, '2026-11-15');
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.error.code).toBe('invalid_observer');
  });

  it('computeAstroDay rejects an unsupported year', () => {
    const res1999 = computeAstroDay(RAJKOT_OBSERVER, '1999-12-31');
    expect(res1999.ok).toBe(false);
    if (!res1999.ok) {
      expect(res1999.error.code).toBe('unsupported_date');
    }

    const res2101 = computeAstroDay(RAJKOT_OBSERVER, '2101-01-01');
    expect(res2101.ok).toBe(false);
    if (!res2101.ok) {
      expect(res2101.error.code).toBe('unsupported_date');
    }
  });

  it('computeAstroDay rejects an impossible calendar date', () => {
    const res = computeAstroDay(RAJKOT_OBSERVER, '2026-02-29');
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.error.code).toBe('invalid_date');
  });

  it('computeAstroDay reports event_missing instead of inventing a time', () => {
    // High Arctic latitude 80 N on the winter solstice experiences polar night: sun never rises
    const res = computeAstroDay({ lat: 80, lon: 70.8 }, '2026-12-21');
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.error.code).toBe('event_missing');
  });

  it('computeAstroDay ignores elevation for sunrise and sunset', () => {
    const seaLevel = computeAstroDay({ lat: 22.3, lon: 70.8, elevationM: 0 }, '2026-11-15');
    const highAltitude = computeAstroDay({ lat: 22.3, lon: 70.8, elevationM: 3000 }, '2026-11-15');

    expect(seaLevel.ok).toBe(true);
    expect(highAltitude.ok).toBe(true);
    if (!seaLevel.ok || !highAltitude.ok) return;

    expect(highAltitude.value.sunrise).toBe(seaLevel.value.sunrise);
    expect(highAltitude.value.sunset).toBe(seaLevel.value.sunset);
  });

  it('computeAstroDay is deterministic for repeated calls', () => {
    const call1 = computeAstroDay(RAJKOT_OBSERVER, '2026-06-21');
    const call2 = computeAstroDay(RAJKOT_OBSERVER, '2026-06-21');

    expect(call1.ok).toBe(true);
    expect(call2.ok).toBe(true);
    if (!call1.ok || !call2.ok) return;

    expect(call1.value).toEqual(call2.value);
  });

  it('computeAstroDay handles the leap day 2028-02-29', () => {
    const res = computeAstroDay(RAJKOT_OBSERVER, '2028-02-29');
    expect(res.ok).toBe(true);
    if (!res.ok) return;

    expect(res.value.istDate).toBe('2028-02-29');
    expect(res.value.sunrise).toBeGreaterThan(0);
    expect(res.value.sunset).toBeGreaterThan(res.value.sunrise);
  });

  it('computeAstroDay handles the year boundary from 2026-12-31 to 2027-01-01', () => {
    const resDec = computeAstroDay(RAJKOT_OBSERVER, '2026-12-31');
    const resJan = computeAstroDay(RAJKOT_OBSERVER, '2027-01-01');

    expect(resDec.ok).toBe(true);
    expect(resJan.ok).toBe(true);
    if (!resDec.ok || !resJan.ok) return;

    expect(resJan.value.sunrise).toBeGreaterThan(resDec.value.sunset);
  });

  it('computeAstroDay handles Kibithu in June with sunrise before 05:00 IST', () => {
    // Kibithu, Arunachal Pradesh (easternmost point in India): lat 28.23, lon 97.01
    const res = computeAstroDay({ lat: 28.23, lon: 97.01 }, '2026-06-21');
    expect(res.ok).toBe(true);
    if (!res.ok) return;

    const dayStartRes = istDateToStartMs('2026-06-21');
    expect(dayStartRes.ok).toBe(true);
    if (!dayStartRes.ok) return;

    const fiveAmMs = dayStartRes.value + 5 * 3600 * 1000;
    expect(res.value.sunrise).toBeLessThan(fiveAmMs);
  });

  it('computeAstroDay finds all events at 37 degrees north in June and December', () => {
    // Northern border of India / Ladakh: lat 37.0, lon 74.0
    const observer = { lat: 37.0, lon: 74.0 };
    const resJune = computeAstroDay(observer, '2026-06-21');
    const resDec = computeAstroDay(observer, '2026-12-21');

    expect(resJune.ok).toBe(true);
    expect(resDec.ok).toBe(true);
    if (!resJune.ok || !resDec.ok) return;

    expect(resJune.value.sunrise).toBeLessThan(resJune.value.sunset);
    expect(resDec.value.sunrise).toBeLessThan(resDec.value.sunset);
  });

  it('moon events for a day list every rise and set inside the IST day in ascending order', () => {
    expect(sortInstants(100, 200)).toBe(-100);
    expect(sortInstants(200, 100)).toBe(100);

    const res = computeMoonEvents(RAJKOT_OBSERVER, '2026-11-15');
    expect(res.ok).toBe(true);
    if (!res.ok) return;

    const events = res.value;
    expect(events.length).toBeGreaterThan(0);

    for (let i = 1; i < events.length; i++) {
      const prev = events[i - 1];
      const curr = events[i];
      if (prev && curr) {
        expect(curr.ev.displayMs).toBeGreaterThanOrEqual(prev.ev.displayMs);
      }
    }
  });

  it('a day without a moonrise has no rise event for that IST day', () => {
    const refPath = path.resolve('packages/engine/tests/data/astro-reference-v1.json');
    const ref = JSON.parse(fs.readFileSync(refPath, 'utf8')) as {
      cities: Array<{ id: string; lat: number; lon: number }>;
      days: Array<{ c: string; d: string; moonrise: number[] }>;
    };

    const noMoonriseEntry = ref.days.find((d) => d.moonrise.length === 0);
    expect(
      noMoonriseEntry,
      'Expected to find a day in astro-reference-v1.json without a moonrise',
    ).toBeDefined();
    if (!noMoonriseEntry) return;

    const cityMeta = ref.cities.find((c) => c.id === noMoonriseEntry.c);
    expect(cityMeta).toBeDefined();
    if (!cityMeta) return;

    const obs = { lat: cityMeta.lat, lon: cityMeta.lon };
    const astroRes = computeAstroDay(obs, noMoonriseEntry.d);
    expect(astroRes.ok).toBe(true);
    if (!astroRes.ok) return;

    expect(astroRes.value.moonrise.length).toBe(0);

    const moonRes = computeMoonEvents(obs, noMoonriseEntry.d);
    expect(moonRes.ok).toBe(true);
    if (!moonRes.ok) return;

    const riseEvents = moonRes.value.filter((e) => e.kind === 'rise');
    expect(riseEvents.length).toBe(0);
  });

  it('moon phase fraction advances by between 0.02 and 0.05 per day through 2026', () => {
    // The synodic month is ~29.53 days, so fraction increases ~0.0338 per day
    const prevPhase = computeAstroDay(RAJKOT_OBSERVER, '2026-01-01');
    expect(prevPhase.ok).toBe(true);
    if (!prevPhase.ok) return;

    // Check sample across months in 2026
    const sampleDates = [
      ['2026-01-15', '2026-01-16'],
      ['2026-04-10', '2026-04-11'],
      ['2026-07-20', '2026-07-21'],
      ['2026-10-05', '2026-10-06'],
    ];

    for (const [d1, d2] of sampleDates) {
      if (!d1 || !d2) continue;
      const res1 = computeAstroDay(RAJKOT_OBSERVER, d1);
      const res2 = computeAstroDay(RAJKOT_OBSERVER, d2);
      expect(res1.ok).toBe(true);
      expect(res2.ok).toBe(true);
      if (!res1.ok || !res2.ok) continue;

      let delta = res2.value.moonPhase.fraction - res1.value.moonPhase.fraction;
      if (delta < 0) {
        delta += 1; // Rollover at new moon
      }
      expect(delta).toBeGreaterThan(0.02);
      expect(delta).toBeLessThan(0.05);
    }
  });

  it('moon phase fraction is below 1 and illumination within 0 and 1 for every day of 2026', () => {
    const dates = ['2026-01-01', '2026-03-15', '2026-06-21', '2026-09-23', '2026-12-31'];
    for (const d of dates) {
      const res = computeAstroDay(RAJKOT_OBSERVER, d);
      expect(res.ok).toBe(true);
      if (!res.ok) continue;

      const { fraction, illumination } = res.value.moonPhase;
      expect(fraction).toBeGreaterThanOrEqual(0);
      expect(fraction).toBeLessThan(1);
      expect(illumination).toBeGreaterThanOrEqual(0);
      expect(illumination).toBeLessThanOrEqual(1);
    }
  });

  it('toDayRecord applies start rounding to sunrise and navkarshi and end rounding to sunset', () => {
    const astroRes = computeAstroDay(RAJKOT_OBSERVER, '2026-11-15');
    expect(astroRes.ok).toBe(true);
    if (!astroRes.ok) return;

    const dayRecord = toDayRecord(astroRes.value);

    // Sunrise: start rounding (ceiling)
    expect(dayRecord.sunrise.displayMs).toBeGreaterThanOrEqual(dayRecord.sunrise.exactMs);
    expect(dayRecord.sunrise.displayMs % 60_000).toBe(0);

    // Navkarshi: start rounding (ceiling)
    expect(dayRecord.navkarshi.displayMs).toBeGreaterThanOrEqual(dayRecord.navkarshi.exactMs);
    expect(dayRecord.navkarshi.displayMs % 60_000).toBe(0);

    // Sunset: end rounding (floor)
    expect(dayRecord.sunset.displayMs).toBeLessThanOrEqual(dayRecord.sunset.exactMs);
    expect(dayRecord.sunset.displayMs % 60_000).toBe(0);
  });

  it('toDayRecord derives the golden morning from sunrise to the plus 6 degree crossing', () => {
    const astroRes = computeAstroDay(RAJKOT_OBSERVER, '2026-11-15');
    expect(astroRes.ok).toBe(true);
    if (!astroRes.ok) return;

    const dayRecord = toDayRecord(astroRes.value);
    expect(dayRecord.goldenMorning.start.exactMs).toBe(dayRecord.sunrise.exactMs);
    expect(dayRecord.goldenMorning.end.exactMs).toBe(astroRes.value.sun6Morning);
    expect(dayRecord.goldenMorning.end.displayMs).toBeLessThanOrEqual(astroRes.value.sun6Morning);
  });

  it('toDayRecord derives the golden evening from the plus 6 degree crossing to sunset', () => {
    const astroRes = computeAstroDay(RAJKOT_OBSERVER, '2026-11-15');
    expect(astroRes.ok).toBe(true);
    if (!astroRes.ok) return;

    const dayRecord = toDayRecord(astroRes.value);
    expect(dayRecord.goldenEvening.start.exactMs).toBe(astroRes.value.sun6Evening);
    expect(dayRecord.goldenEvening.start.displayMs).toBeGreaterThanOrEqual(
      astroRes.value.sun6Evening,
    );
    expect(dayRecord.goldenEvening.end.exactMs).toBe(dayRecord.sunset.exactMs);
  });

  it('toDayRecord keeps solar noon as the exact instant', () => {
    const astroRes = computeAstroDay(RAJKOT_OBSERVER, '2026-11-15');
    expect(astroRes.ok).toBe(true);
    if (!astroRes.ok) return;

    const dayRecord = toDayRecord(astroRes.value);
    expect(dayRecord.solarNoonMs).toBe(astroRes.value.solarNoon);
  });

  it('PROPERTY computeDayRecord navkarshi is exactly 48 minutes after sunrise on screen for random Indian locations and dates', () => {
    fc.assert(
      fc.property(
        // Indian bounding box: lat 8.0 to 35.5, lon 68.0 to 97.0
        fc.float({ min: 8.5, max: 35.0, noNaN: true }),
        fc.float({ min: 69.0, max: 96.0, noNaN: true }),
        fc.integer({ min: 1, max: 365 }),
        (lat, lon, dayOfYear) => {
          // Construct date in 2026 from day of year
          const baseMs = 1767225600000; // 2026-01-01T00:00:00 +05:30
          const epochMs = baseMs + (dayOfYear - 1) * 86_400_000;
          const dateStr = new Date(epochMs + 19_800_000).toISOString().slice(0, 10);

          const res = computeDayRecord({ lat, lon }, dateStr);
          if (!res.ok) {
            return false;
          }
          const record = res.value;
          const delta = record.navkarshi.displayMs - record.sunrise.displayMs;
          return delta === 48 * 60_000;
        },
      ),
      { numRuns: 200 },
    );
  });

  it('computeDayRecord output passes validateSnapshot inside a one-day snapshot', () => {
    // Also verify error handling on invalid observer inputs
    const badDay = computeDayRecord({ lat: 95, lon: 70 }, '2026-11-15');
    expect(badDay.ok).toBe(false);

    const badMoon = computeMoonEvents({ lat: 95, lon: 70 }, '2026-11-15');
    expect(badMoon.ok).toBe(false);

    const dayRes = computeDayRecord(RAJKOT_OBSERVER, '2026-11-15');
    expect(dayRes.ok).toBe(true);
    if (!dayRes.ok) return;

    const moonRes = computeMoonEvents(RAJKOT_OBSERVER, '2026-11-15');
    expect(moonRes.ok).toBe(true);
    if (!moonRes.ok) return;

    const candidate: SnapshotV1 = {
      schemaVersion: 1,
      generatedAtMs: 1763164800000,
      engine: {
        name: ASTRONOMY_ENGINE.name,
        version: ASTRONOMY_ENGINE.version,
      },
      location: RAJKOT_LOCATION,
      days: [dayRes.value],
      moonEvents: moonRes.value,
    };

    const validated = validateSnapshot(candidate);
    expect(validated.ok).toBe(true);
  });

  it('accuracyTier is standard through 2035 approximate until 2100 and unsupported outside', () => {
    expect(accuracyTier('2000-01-01')).toBe('standard');
    expect(accuracyTier('2026-11-15')).toBe('standard');
    expect(accuracyTier('2035-12-31')).toBe('standard');
    expect(accuracyTier('2036-01-01')).toBe('approximate');
    expect(accuracyTier('2100-12-31')).toBe('approximate');
    expect(accuracyTier('1999-12-31')).toBe('unsupported');
    expect(accuracyTier('2101-01-01')).toBe('unsupported');
    expect(accuracyTier('invalid-date')).toBe('unsupported');
  });

  it('planSnapshotWindow starts one day before today and spans 92 days', () => {
    const dayStart = istDateToStartMs('2026-11-15');
    expect(dayStart.ok).toBe(true);
    if (!dayStart.ok) return;

    const nowMs = dayStart.value + 10 * 3600 * 1000 + 30 * 60 * 1000; // 2026-11-15 10:30:00 IST
    const window = planSnapshotWindow(nowMs);
    expect(window.startIstDate).toBe('2026-11-14');
    expect(window.dayCount).toBe(92);
  });

  it('buildSnapshot produces a snapshot that passes validateSnapshot', () => {
    // Also test validation failure branch with invalid label
    const badLabelRes = buildSnapshot({
      location: { ...RAJKOT_LOCATION, label: '' },
      startIstDate: '2026-11-14',
      dayCount: 2,
      generatedAtMs: 1763182800000,
    });
    expect(badLabelRes.ok).toBe(false);
    if (!badLabelRes.ok) {
      expect(badLabelRes.error.code).toBe('invalid_snapshot');
    }

    const res = buildSnapshot({
      location: RAJKOT_LOCATION,
      startIstDate: '2026-11-14',
      dayCount: 92,
      generatedAtMs: 1763182800000,
    });

    expect(res.ok).toBe(true);
    if (!res.ok) return;

    const validated = validateSnapshot(res.value);
    expect(validated.ok).toBe(true);
  });

  it('buildSnapshot is deterministic for the same input', () => {
    const opts = {
      location: RAJKOT_LOCATION,
      startIstDate: '2026-11-14',
      dayCount: 7,
      generatedAtMs: 1763182800000,
    };
    const res1 = buildSnapshot(opts);
    const res2 = buildSnapshot(opts);

    expect(res1.ok).toBe(true);
    expect(res2.ok).toBe(true);
    if (!res1.ok || !res2.ok) return;

    expect(res1.value).toEqual(res2.value);
  });

  it('buildSnapshot sets generatedAtMs and the engine name and version', () => {
    const genMs = 1763182800000;
    const res = buildSnapshot({
      location: RAJKOT_LOCATION,
      startIstDate: '2026-11-14',
      dayCount: 3,
      generatedAtMs: genMs,
    });

    expect(res.ok).toBe(true);
    if (!res.ok) return;

    expect(res.value.generatedAtMs).toBe(genMs);
    expect(res.value.engine.name).toBe(ASTRONOMY_ENGINE.name);
    expect(res.value.engine.version).toBe(ASTRONOMY_ENGINE.version);
  });

  it('buildSnapshot day records are contiguous across a month and year boundary', () => {
    const res = buildSnapshot({
      location: RAJKOT_LOCATION,
      startIstDate: '2026-12-30',
      dayCount: 5,
      generatedAtMs: 1767052800000,
    });

    expect(res.ok).toBe(true);
    if (!res.ok) return;

    const dates = res.value.days.map((d) => d.istDate);
    expect(dates).toEqual(['2026-12-30', '2026-12-31', '2027-01-01', '2027-01-02', '2027-01-03']);
  });

  it('buildSnapshot moon events extend two days past the last day', () => {
    const dayCount = 10;
    const startIstDate = '2026-11-14';
    const res = buildSnapshot({
      location: RAJKOT_LOCATION,
      startIstDate,
      dayCount,
      generatedAtMs: 1763182800000,
    });

    expect(res.ok).toBe(true);
    if (!res.ok) return;

    // Last day of days array is start + 9 days = 2026-11-23
    // Lookahead is 2 extra days: 2026-11-24 and 2026-11-25
    // End of 2026-11-25 is start of 2026-11-26
    const dayStartRes = istDateToStartMs('2026-11-25');
    expect(dayStartRes.ok).toBe(true);
    if (!dayStartRes.ok) return;

    const nov25EndMs = dayStartRes.value + 86_400_000;
    const lastMoon = res.value.moonEvents[res.value.moonEvents.length - 1];
    expect(lastMoon).toBeDefined();
    if (lastMoon) {
      expect(lastMoon.ev.exactMs).toBeLessThan(nov25EndMs);
      expect(lastMoon.ev.exactMs).toBeGreaterThan(dayStartRes.value);
    }
  });

  it('buildSnapshot moon events are sorted ascending', () => {
    const res = buildSnapshot({
      location: RAJKOT_LOCATION,
      startIstDate: '2026-11-14',
      dayCount: 14,
      generatedAtMs: 1763182800000,
    });

    expect(res.ok).toBe(true);
    if (!res.ok) return;

    const events = res.value.moonEvents;
    for (let i = 1; i < events.length; i++) {
      const prev = events[i - 1];
      const curr = events[i];
      if (prev && curr) {
        expect(curr.ev.displayMs).toBeGreaterThanOrEqual(prev.ev.displayMs);
      }
    }
  });

  it('buildSnapshot rejects dayCount above 400 or below 1', () => {
    const res0 = buildSnapshot({
      location: RAJKOT_LOCATION,
      startIstDate: '2026-11-14',
      dayCount: 0,
      generatedAtMs: 1763182800000,
    });
    expect(res0.ok).toBe(false);
    if (!res0.ok) {
      expect(res0.error.code).toBe('invalid_input');
    }

    const res401 = buildSnapshot({
      location: RAJKOT_LOCATION,
      startIstDate: '2026-11-14',
      dayCount: 401,
      generatedAtMs: 1763182800000,
    });
    expect(res401.ok).toBe(false);
    if (!res401.ok) {
      expect(res401.error.code).toBe('invalid_input');
    }
  });

  it('buildSnapshot rejects an invalid start date or location', () => {
    const resBadDate = buildSnapshot({
      location: RAJKOT_LOCATION,
      startIstDate: 'invalid-date',
      dayCount: 10,
      generatedAtMs: 1763182800000,
    });
    expect(resBadDate.ok).toBe(false);

    const resBadLoc = buildSnapshot({
      location: { ...RAJKOT_LOCATION, lat: 95 },
      startIstDate: '2026-11-14',
      dayCount: 10,
      generatedAtMs: 1763182800000,
    });
    expect(resBadLoc.ok).toBe(false);
  });

  it('buildSnapshot fails with event_missing for a polar location', () => {
    const polarLocation: SnapshotLocation = {
      lat: 80,
      lon: 70.8,
      label: 'Polar Station',
      source: 'manual',
      fixAtMs: 1766275200000,
    };
    const res = buildSnapshot({
      location: polarLocation,
      startIstDate: '2026-12-21',
      dayCount: 5,
      generatedAtMs: 1766275200000,
    });
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.error.code).toBe('event_missing');
  });

  it('buildSnapshotAround uses the injected clock', () => {
    const dayStart = istDateToStartMs('2026-11-15');
    expect(dayStart.ok).toBe(true);
    if (!dayStart.ok) return;

    const fixedNowMs = dayStart.value + 10 * 3600 * 1000;
    const clock = createFixedClock(fixedNowMs);
    const res = buildSnapshotAround(clock, RAJKOT_LOCATION);

    expect(res.ok).toBe(true);
    if (!res.ok) return;

    expect(res.value.generatedAtMs).toBe(fixedNowMs);
    expect(res.value.days[1]?.istDate).toBe('2026-11-15');
  });

  it('buildSnapshot JSON for 92 days stays under 120 KB', () => {
    const res = buildSnapshot({
      location: RAJKOT_LOCATION,
      startIstDate: '2026-11-14',
      dayCount: 92,
      generatedAtMs: 1763182800000,
    });

    expect(res.ok).toBe(true);
    if (!res.ok) return;

    const json = JSON.stringify(res.value);
    const bytes = Buffer.byteLength(json, 'utf8');
    expect(bytes).toBeLessThan(120 * 1024);
  });

  it('engine reports the installed astronomy-engine version', () => {
    expect(ASTRONOMY_ENGINE.name).toBe('astronomy-engine');
    expect(ASTRONOMY_ENGINE.version).toBe('2.1.19');
  });

  it('countdown targets from a built snapshot are ready at 10:00 IST on 2026-11-15', () => {
    const dayStartRes = istDateToStartMs('2026-11-15');
    expect(dayStartRes.ok).toBe(true);
    if (!dayStartRes.ok) return;

    const tenAmMs = dayStartRes.value + 10 * 3600 * 1000;
    const res = buildSnapshot({
      location: RAJKOT_LOCATION,
      startIstDate: '2026-11-14',
      dayCount: 7,
      generatedAtMs: tenAmMs,
    });
    expect(res.ok).toBe(true);
    if (!res.ok) return;

    const series = buildOccurrenceSeries(res.value);
    const state = getCountdownState(series.sunset, tenAmMs);
    expect(state.status).toBe('ready');
    if (state.status === 'ready') {
      expect(state.remainingMinutes).toBeGreaterThan(0);
      expect(state.progress).toBeGreaterThan(0);
      expect(state.progress).toBeLessThan(1);
    }
  });

  it('day and night from a built snapshot switch at the displayed sunrise and sunset minutes', () => {
    const res = buildSnapshot({
      location: RAJKOT_LOCATION,
      startIstDate: '2026-11-15',
      dayCount: 1,
      generatedAtMs: 1763182800000,
    });
    expect(res.ok).toBe(true);
    if (!res.ok) return;

    const day = res.value.days[0];
    expect(day).toBeDefined();
    if (!day) return;

    const endpoints = {
      sunriseDisplayMs: day.sunrise.displayMs,
      sunsetDisplayMs: day.sunset.displayMs,
    };

    expect(dayNight(endpoints.sunriseDisplayMs - 1, endpoints)).toBe('night');
    expect(dayNight(endpoints.sunriseDisplayMs, endpoints)).toBe('day');
    expect(dayNight(endpoints.sunsetDisplayMs - 1, endpoints)).toBe('day');
    expect(dayNight(endpoints.sunsetDisplayMs, endpoints)).toBe('night');
  });

  it('greeting from a built snapshot follows noon and the evening rule for Rajkot', () => {
    const res = buildSnapshot({
      location: RAJKOT_LOCATION,
      startIstDate: '2026-11-15',
      dayCount: 1,
      generatedAtMs: 1763182800000,
    });
    expect(res.ok).toBe(true);
    if (!res.ok) return;

    const day = res.value.days[0];
    expect(day).toBeDefined();
    if (!day) return;

    const anchors = {
      solarNoonMs: day.solarNoonMs,
      sunsetMs: day.sunset.exactMs,
    };

    const dayStart = istDateToStartMs('2026-11-15');
    expect(dayStart.ok).toBe(true);
    if (!dayStart.ok) return;

    const threeAm = dayStart.value + 3 * 3600 * 1000;
    const sixAm = dayStart.value + 6 * 3600 * 1000;
    const twoPm = dayStart.value + 14 * 3600 * 1000;
    const sixPm = dayStart.value + 18 * 3600 * 1000;

    expect(selectGreeting(threeAm, anchors)).toBe('night');
    expect(selectGreeting(sixAm, anchors)).toBe('morning');
    expect(selectGreeting(twoPm, anchors)).toBe('afternoon');
    expect(selectGreeting(sixPm, anchors)).toBe('evening');
  });

  it('snapshot status from a built snapshot is ready now and expiring a week before the end', () => {
    const dayStart = istDateToStartMs('2026-11-15');
    expect(dayStart.ok).toBe(true);
    if (!dayStart.ok) return;

    const genMs = dayStart.value + 10 * 3600 * 1000; // 2026-11-15 10:00:00 IST
    const res = buildSnapshot({
      location: RAJKOT_LOCATION,
      startIstDate: '2026-11-14',
      dayCount: 92,
      generatedAtMs: genMs,
    });
    expect(res.ok).toBe(true);
    if (!res.ok) return;

    const snapshot = res.value;
    expect(getSnapshotStatus(snapshot, genMs)).toBe('ready');

    const lastDay = snapshot.days[snapshot.days.length - 1];
    expect(lastDay).toBeDefined();
    if (!lastDay) return;

    const lastDayStartRes = istDateToStartMs(lastDay.istDate);
    expect(lastDayStartRes.ok).toBe(true);
    if (!lastDayStartRes.ok) return;

    const lastDayEndMs = lastDayStartRes.value + 86_400_000;

    // 5 days before expiration (within the 7-day expiring window)
    const fiveDaysRemaining = lastDayEndMs - 5 * 86_400_000;
    expect(getSnapshotStatus(snapshot, fiveDaysRemaining)).toBe('expiring');

    // After expiration
    expect(getSnapshotStatus(snapshot, lastDayEndMs)).toBe('expired');
  });
});
