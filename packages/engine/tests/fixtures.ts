import type { DayRecord, MoonEvent, SnapshotV1 } from '@arunodaya/contracts';
import { addIstDays, istDateToStartMs } from '../src/time/ist.js';
import { makeEvent, makeNavkarshi } from '../src/time/rounding.js';

export interface MakeSnapshotFixtureOptions {
  startIstDate?: string;
  dayCount?: number;
  sunriseSecondOfDay?: number;
  sunsetSecondOfDay?: number;
  solarNoonSecondOfDay?: number;
  civilDawnSecondOfDay?: number;
  civilDuskSecondOfDay?: number;
}

/**
 * SYNTHETIC FIXTURE GENERATOR FOR ENGINE TESTS
 * Generates deterministic synthetic SnapshotV1 fixtures (not real astronomy).
 * Defaults resemble a mid-November Rajkot day:
 * - Sunrise: 06:48:20 IST (24500s)
 * - Solar Noon: 12:19:10 IST (44350s)
 * - Sunset: 17:49:40 IST (64180s)
 * - Civil Dawn: 06:23:00 IST (22980s)
 * - Civil Dusk: 18:15:00 IST (65700s)
 */
export function makeSnapshotFixture(options: MakeSnapshotFixtureOptions = {}): SnapshotV1 {
  const {
    startIstDate = '2026-11-15',
    dayCount = 30,
    sunriseSecondOfDay = 6 * 3600 + 48 * 60 + 20, // 06:48:20
    solarNoonSecondOfDay = 12 * 3600 + 19 * 60 + 10, // 12:19:10
    sunsetSecondOfDay = 17 * 3600 + 49 * 60 + 40, // 17:49:40
    civilDawnSecondOfDay = 6 * 3600 + 23 * 60, // 06:23:00
    civilDuskSecondOfDay = 18 * 3600 + 15 * 60, // 18:15:00
  } = options;

  const days: DayRecord[] = [];
  const moonEvents: MoonEvent[] = [];

  for (let i = 0; i < dayCount; i++) {
    const istDate = addIstDays(startIstDate, i);
    const dayStartRes = istDateToStartMs(istDate);
    if (!dayStartRes.ok) {
      throw new Error(`Invalid fixture date: ${istDate}`);
    }
    const dayStartMs = dayStartRes.value;

    const sunriseExactMs = dayStartMs + sunriseSecondOfDay * 1000;
    const sunsetExactMs = dayStartMs + sunsetSecondOfDay * 1000;
    const solarNoonMs = dayStartMs + solarNoonSecondOfDay * 1000;
    const civilDawnExactMs = dayStartMs + civilDawnSecondOfDay * 1000;
    const civilDuskExactMs = dayStartMs + civilDuskSecondOfDay * 1000;

    const sunrise = makeEvent('start', sunriseExactMs);
    const navkarshi = makeNavkarshi(sunriseExactMs);
    const sunset = makeEvent('end', sunsetExactMs);
    const civilDawn = makeEvent('start', civilDawnExactMs);
    const civilDusk = makeEvent('end', civilDuskExactMs);

    const goldenMorning = {
      start: makeEvent('start', sunriseExactMs - 20 * 60 * 1000),
      end: makeEvent('end', sunriseExactMs + 40 * 60 * 1000),
    };

    const goldenEvening = {
      start: makeEvent('start', sunsetExactMs - 40 * 60 * 1000),
      end: makeEvent('end', sunsetExactMs + 20 * 60 * 1000),
    };

    days.push({
      istDate,
      sunrise,
      navkarshi,
      sunset,
      civilDawn,
      civilDusk,
      solarNoonMs,
      goldenMorning,
      goldenEvening,
      moonPhaseAtNoon: {
        phase: (0.2 + i * 0.03) % 1,
        illumination: 0.5,
      },
    });

    // Synthetic moon events: rise at ~11:30, set at ~22:45
    const moonriseMs = dayStartMs + (11 * 3600 + 30 * 60) * 1000;
    const moonsetMs = dayStartMs + (22 * 3600 + 45 * 60) * 1000;

    moonEvents.push({
      kind: 'rise',
      ev: makeEvent('start', moonriseMs),
    });
    moonEvents.push({
      kind: 'set',
      ev: makeEvent('end', moonsetMs),
    });
  }

  moonEvents.sort((a, b) => a.ev.displayMs - b.ev.displayMs);

  return {
    schemaVersion: 1,
    generatedAtMs: 1763184000000,
    engine: {
      name: 'synthetic-engine-fixture',
      version: '1.0.0',
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
