import { describe, expect, it } from 'vitest';
import { istDayStartMs } from '../../lib/ist-day.mjs';
import { validateReferenceDataset } from '../../lib/reference-schema.mjs';

function createMinimalDataset() {
  const dStr = '2026-11-15';
  const startMs = istDayStartMs(dStr);
  return {
    meta: {
      schemaVersion: 1,
      primary: 'skyfield',
      generator: {
        python: '3.12.8',
        packages: { skyfield: '1.49', ephem: '4.1.6' },
        kernel: {
          name: 'de440s.bsp',
          sha256: 'abcdef1234567890',
          bytes: 32000000,
        },
      },
      conventions: 'canonical docs/ASTRONOMY.md conventions',
      imageDigest:
        'python:3.12-slim@sha256:5e2bdb1b0d542d5039cffb8181c65930093949194a65c365dfb1b0fe13a4fa5b',
      cityCount: 1,
      dayCount: 1,
      decisionDayCount: 1,
      extendedDayCount: 0,
      crossCheck: {
        method: 'ephem',
        cityDays: 1,
        perKind: {},
        worst: [],
      },
    },
    cities: [
      {
        id: 'rajkot',
        name: 'Rajkot',
        lat: 22.3,
        lon: 70.8,
        elevationM: 130,
        role: 'core',
      },
    ],
    days: [
      {
        c: 'rajkot',
        d: dStr,
        s: 'decision',
        sunrise: startMs + 6 * 3600 * 1000 + 45 * 60 * 1000,
        sunset: startMs + 18 * 3600 * 1000,
        solarNoon: startMs + 12 * 3600 * 1000 + 20 * 60 * 1000,
        civilDawn: startMs + 6 * 3600 * 1000 + 20 * 60 * 1000,
        civilDusk: startMs + 18 * 3600 * 1000 + 25 * 60 * 1000,
        sun6Morning: startMs + 7 * 3600 * 1000,
        sun6Evening: startMs + 17 * 3600 * 1000 + 40 * 60 * 1000,
        moonrise: [startMs + 11 * 3600 * 1000],
        moonset: [startMs + 23 * 3600 * 1000],
        moonPhase: {
          fraction: 0.15,
          illumination: 0.22,
        },
      },
    ],
  };
}

describe('reference-schema', () => {
  it('reference schema accepts a minimal valid dataset', () => {
    const ds = createMinimalDataset();
    const result = validateReferenceDataset(ds);
    expect(result.issues).toEqual([]);
    expect(result.ok).toBe(true);
  });

  it('reference schema rejects a day with an unknown city', () => {
    const ds = createMinimalDataset();
    ds.days[0].c = 'unknown-city-xyz';
    const result = validateReferenceDataset(ds);
    expect(result.ok).toBe(false);
    expect(result.issues.some((i) => i.message.includes('Unknown city id'))).toBe(true);
  });

  it('reference schema rejects unsorted days within a city', () => {
    const ds = createMinimalDataset();
    const d1 = ds.days[0];
    const d2 = { ...d1, d: '2026-11-14' };
    ds.days = [d1, d2];
    ds.meta.dayCount = 2;
    ds.meta.decisionDayCount = 2;
    const result = validateReferenceDataset(ds);
    expect(result.ok).toBe(false);
    expect(result.issues.some((i) => i.message.includes('not sorted ascending by date'))).toBe(
      true,
    );
  });

  it('reference schema rejects an event outside its IST day', () => {
    const ds = createMinimalDataset();
    const startMs = istDayStartMs('2026-11-15');
    ds.days[0].sunrise = startMs - 1000; // 1s before 00:00 IST
    const result = validateReferenceDataset(ds);
    expect(result.ok).toBe(false);
    expect(result.issues.some((i) => i.message.includes('lies outside its IST day'))).toBe(true);
  });

  it('reference schema rejects non-integer event milliseconds', () => {
    const ds = createMinimalDataset();
    ds.days[0].solarNoon = 1763188800123.456;
    const result = validateReferenceDataset(ds);
    expect(result.ok).toBe(false);
    expect(result.issues.some((i) => i.message.includes('must be an integer epoch ms'))).toBe(true);
  });

  it('reference schema requires moon events as arrays', () => {
    const ds = createMinimalDataset();
    // @ts-expect-error testing invalid type
    ds.days[0].moonrise = 1763188800000;
    const result = validateReferenceDataset(ds);
    expect(result.ok).toBe(false);
    expect(result.issues.some((i) => i.message.includes('must be an array'))).toBe(true);
  });

  it('reference schema rejects a day without a decision or extended tag', () => {
    const ds = createMinimalDataset();
    // @ts-expect-error testing invalid set
    ds.days[0].s = 'invalid-tag';
    const result = validateReferenceDataset(ds);
    expect(result.ok).toBe(false);
    expect(
      result.issues.some((i) => i.message.includes('must be either "decision" or "extended"')),
    ).toBe(true);
  });
});
