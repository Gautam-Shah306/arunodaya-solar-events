import { addDaysToCivilDate, daysFromCivil, parseCivilDate } from '../src/civil-date.js';
import type { DayRecord, MoonEvent, SnapshotV1 } from '../src/snapshot.js';

/**
 * SYNTHETIC TEST FIXTURE BUILDER
 * Generates synthetic, deterministic, mathematically consistent SnapshotV1 instances for unit testing.
 * NOT derived from real astronomical planetary calculations.
 */

const IST_OFFSET_MS = 19_800_000;
const MS_PER_DAY = 86_400_000;

export interface MakeSyntheticSnapshotOptions {
  startDate?: string;
  dayCount?: number;
  engineName?: string;
  engineVersion?: string;
}

/**
 * Builds a valid synthetic SnapshotV1 instance strictly meeting all validation rules.
 * @param options Configuration options for synthetic snapshot generation
 */
export function makeSyntheticSnapshot(options: MakeSyntheticSnapshotOptions = {}): SnapshotV1 {
  const {
    startDate = '2026-11-15',
    dayCount = 5,
    engineName = 'synthetic-contracts-fixture',
    engineVersion = '1.0.0',
  } = options;

  const days: DayRecord[] = [];
  const moonEvents: MoonEvent[] = [];

  for (let i = 0; i < dayCount; i++) {
    const istDate = addDaysToCivilDate(startDate, i);
    const parsed = parseCivilDate(istDate);
    if (!parsed.ok) {
      throw new Error(`Invalid synthetic date: ${istDate}`);
    }

    const epochDays = daysFromCivil(parsed.value.year, parsed.value.month, parsed.value.day);
    const dayStartMs = epochDays * MS_PER_DAY - IST_OFFSET_MS;

    // Events within day:
    // Dawn: 06:18:00
    // Sunrise: 06:48:00
    // Navkarshi: 07:36:00 (exact sunrise + 48 min)
    // Noon: 12:15:00
    // Sunset: 17:50:00
    // Dusk: 18:16:00
    const civilDawnExact = dayStartMs + (6 * 3600 + 18 * 60) * 1000;
    const sunriseExact = dayStartMs + (6 * 3600 + 48 * 60) * 1000;
    const navkarshiExact = sunriseExact + 48 * 60 * 1000; // 2880000 ms
    const solarNoonMs = dayStartMs + (12 * 3600 + 15 * 60) * 1000;
    const sunsetExact = dayStartMs + (17 * 3600 + 50 * 60) * 1000;
    const civilDuskExact = dayStartMs + (18 * 3600 + 16 * 60) * 1000;

    // Golden hours
    const gmStartExact = sunriseExact - 20 * 60 * 1000;
    const gmEndExact = sunriseExact + 40 * 60 * 1000;
    const geStartExact = sunsetExact - 40 * 60 * 1000;
    const geEndExact = sunsetExact + 20 * 60 * 1000;

    days.push({
      istDate,
      sunrise: { exactMs: sunriseExact, displayMs: sunriseExact },
      navkarshi: { exactMs: navkarshiExact, displayMs: navkarshiExact },
      sunset: { exactMs: sunsetExact, displayMs: sunsetExact },
      civilDawn: { exactMs: civilDawnExact, displayMs: civilDawnExact },
      civilDusk: { exactMs: civilDuskExact, displayMs: civilDuskExact },
      solarNoonMs,
      goldenMorning: {
        start: { exactMs: gmStartExact, displayMs: gmStartExact },
        end: { exactMs: gmEndExact, displayMs: gmEndExact },
      },
      goldenEvening: {
        start: { exactMs: geStartExact, displayMs: geStartExact },
        end: { exactMs: geEndExact, displayMs: geEndExact },
      },
      moonPhaseAtNoon: {
        phase: (0.2 + i * 0.03) % 1,
        illumination: 0.5,
      },
    });

    // Add rising and setting moon events sorted
    const moonriseExact = dayStartMs + (11 * 3600 + 30 * 60) * 1000;
    const moonsetExact = dayStartMs + (22 * 3600 + 45 * 60) * 1000;

    moonEvents.push({
      kind: 'rise',
      ev: { exactMs: moonriseExact, displayMs: moonriseExact },
    });
    moonEvents.push({
      kind: 'set',
      ev: { exactMs: moonsetExact, displayMs: moonsetExact },
    });
  }

  // Ensure moonEvents are strictly ascending by displayMs
  moonEvents.sort((a, b) => a.ev.displayMs - b.ev.displayMs);

  return {
    schemaVersion: 1,
    generatedAtMs: 1763184000000,
    engine: {
      name: engineName,
      version: engineVersion,
    },
    location: {
      lat: 22.3,
      lon: 70.8,
      elevationM: 138,
      label: 'Rajkot, Gujarat',
      source: 'manual',
      fixAtMs: 1763184000000,
      accuracyM: 10,
    },
    days,
    moonEvents,
  };
}
