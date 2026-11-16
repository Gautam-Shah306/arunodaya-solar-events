import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { istDayStartMs } from '../../lib/ist-day.mjs';
import { validateReferenceDataset } from '../../lib/reference-schema.mjs';

const datasetPath = path.resolve('packages/engine/tests/data/astro-reference-v1.json');

function loadDataset() {
  if (!fs.existsSync(datasetPath)) {
    throw new Error(`Reference dataset file not found: ${datasetPath}`);
  }
  return JSON.parse(fs.readFileSync(datasetPath, 'utf8'));
}

describe('reference-dataset', () => {
  it('committed reference dataset passes the schema', () => {
    const data = loadDataset();
    const result = validateReferenceDataset(data);
    expect(result.issues).toEqual([]);
    expect(result.ok).toBe(true);
  });

  it('committed reference dataset covers at least 25 cities and 2500 city-days', () => {
    const data = loadDataset();
    expect(data.cities.length).toBeGreaterThanOrEqual(25);
    expect(data.days.length).toBeGreaterThanOrEqual(2500);
  });

  it('committed reference dataset includes the full year 2026 for the six core cities', () => {
    const data = loadDataset();
    const coreCities = ['rajkot', 'dwarka', 'new-delhi', 'kolkata', 'chennai', 'kibithu'];

    for (const cityId of coreCities) {
      const cityDays = data.days.filter((d) => d.c === cityId && d.d.startsWith('2026-'));
      expect(cityDays.length).toBe(365);
    }
  });

  it('committed reference dataset tags 24 extended-range city-days', () => {
    const data = loadDataset();
    const extended = data.days.filter((d) => d.s === 'extended');
    expect(extended).toHaveLength(24);
  });

  it('committed reference dataset sunrise for Rajkot on 2026-11-15 is between 06:45 and 07:15 IST', () => {
    const data = loadDataset();
    const day = data.days.find((d) => d.c === 'rajkot' && d.d === '2026-11-15');
    expect(day).toBeDefined();

    const dayStart = istDayStartMs('2026-11-15');
    const minSunrise = dayStart + (6 * 3600 + 45 * 60) * 1000;
    const maxSunrise = dayStart + (7 * 3600 + 15 * 60) * 1000;

    expect(day.sunrise).toBeGreaterThanOrEqual(minSunrise);
    expect(day.sunrise).toBeLessThanOrEqual(maxSunrise);
  });

  it('committed reference daylight for Rajkot on 2026-11-15 is between 10h 50m and 11h 20m', () => {
    const data = loadDataset();
    const day = data.days.find((d) => d.c === 'rajkot' && d.d === '2026-11-15');
    expect(day).toBeDefined();

    const daylightMs = day.sunset - day.sunrise;
    const minDaylight = (10 * 3600 + 50 * 60) * 1000;
    const maxDaylight = (11 * 3600 + 20 * 60) * 1000;

    expect(daylightMs).toBeGreaterThanOrEqual(minDaylight);
    expect(daylightMs).toBeLessThanOrEqual(maxDaylight);
  });

  it('committed reference dataset records generator versions kernel and conventions', () => {
    const data = loadDataset();
    expect(data.meta.generator.python).toBeTruthy();
    expect(data.meta.generator.packages.skyfield).toBeTruthy();
    expect(data.meta.generator.kernel.name).toBe('de440s.bsp');
    expect(data.meta.generator.kernel.sha256).toHaveLength(64);
    expect(data.meta.conventions).toBeTruthy();
  });

  it('committed reference cross-check is within tolerance or explicitly unavailable', () => {
    const data = loadDataset();
    if (data.meta.crossCheck) {
      const perKind = data.meta.crossCheck.perKind;
      for (const kind of [
        'sunrise',
        'sunset',
        'solarNoon',
        'civilDawn',
        'civilDusk',
        'sun6Morning',
        'sun6Evening',
      ]) {
        if (perKind[kind]) {
          expect(perKind[kind].maxSeconds).toBeLessThanOrEqual(30.0);
        }
      }
      for (const kind of ['moonrise', 'moonset']) {
        if (perKind[kind]) {
          expect(perKind[kind].maxSeconds).toBeLessThanOrEqual(90.0);
        }
      }
    } else {
      expect(data.meta.crossCheckReason).toBeTruthy();
    }
  });
});
