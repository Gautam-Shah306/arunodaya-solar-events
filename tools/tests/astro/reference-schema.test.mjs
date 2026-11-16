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

  it('rejects non-object dataset', () => {
    // @ts-expect-error testing invalid type
    expect(validateReferenceDataset(null).ok).toBe(false);
    // @ts-expect-error testing invalid type
    expect(validateReferenceDataset('str').ok).toBe(false);
  });

  it('rejects invalid meta structure and types', () => {
    const base = {
      meta: {
        schemaVersion: 2,
        primary: 'invalid-primary',
        generator: null,
        conventions: '',
        imageDigest: '',
        cityCount: '27',
        dayCount: '1',
        decisionDayCount: '1',
        extendedDayCount: '0',
        crossCheck: null,
      },
      cities: [],
      days: [],
    };
    const res = validateReferenceDataset(base);
    expect(res.ok).toBe(false);
    expect(res.issues.length).toBeGreaterThan(5);
  });

  it('rejects undefined crossCheck without reason', () => {
    const base = {
      meta: {
        schemaVersion: 1,
        primary: 'skyfield',
        generator: {},
        conventions: 'test',
        imageDigest: 'digest',
        cityCount: 0,
        dayCount: 0,
        decisionDayCount: 0,
        extendedDayCount: 0,
      },
      cities: [],
      days: [],
    };
    expect(validateReferenceDataset(base).ok).toBe(false);
  });

  it('rejects invalid cities array and elements', () => {
    const base = {
      meta: {
        schemaVersion: 1,
        primary: 'skyfield',
        generator: {},
        conventions: 'test',
        imageDigest: 'digest',
        cityCount: 2,
        dayCount: 0,
        decisionDayCount: 0,
        extendedDayCount: 0,
        crossCheck: null,
        crossCheckReason: 'test',
      },
      cities: [
        null,
        {
          id: null,
          name: 'City1',
          lat: 'bad',
          lon: NaN,
          elevationM: '0',
          role: 'invalid-role',
        },
        {
          id: 'c2',
          name: 'City2',
          lat: 20,
          lon: 70,
          elevationM: 10,
          role: 'core',
        },
        {
          id: 'c2', // duplicate id
          name: 'City2 Duplicate',
          lat: 20,
          lon: 70,
          elevationM: 10,
          role: 'core',
        },
      ],
      days: [],
    };
    // @ts-expect-error testing invalid cities
    const res = validateReferenceDataset(base);
    expect(res.ok).toBe(false);

    // Non-array cities
    const nonArray = { ...base, cities: 'invalid' };
    // @ts-expect-error testing invalid type
    expect(validateReferenceDataset(nonArray).ok).toBe(false);
  });

  it('rejects invalid days elements and values', () => {
    const dStr = '2026-11-15';
    const dayStart = istDayStartMs(dStr);
    const base = {
      meta: {
        schemaVersion: 1,
        primary: 'skyfield',
        generator: {},
        conventions: 'test',
        imageDigest: 'digest',
        cityCount: 1,
        dayCount: 5,
        decisionDayCount: 5,
        extendedDayCount: 0,
        crossCheck: null,
        crossCheckReason: 'test',
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
        null,
        {
          c: null,
          d: 'bad-date',
          s: 'decision',
        },
        {
          c: 'rajkot',
          d: '2026-02-30', // invalid civil values
          s: 'decision',
        },
        {
          c: 'rajkot',
          d: dStr,
          s: 'decision',
          sunrise: 'not-a-number',
          moonrise: [dayStart + 1000, dayStart + 500], // non-ascending
          moonset: 'not-an-array',
          moonPhase: null,
        },
        {
          c: 'rajkot',
          d: dStr,
          s: 'decision',
          moonrise: ['not-a-number'],
          moonPhase: { fraction: -0.1, illumination: 1.5 },
        },
      ],
    };
    // @ts-expect-error testing invalid days
    const res = validateReferenceDataset(base);
    expect(res.ok).toBe(false);

    // Non-array days
    const nonArray = { ...base, days: 'invalid' };
    // @ts-expect-error testing invalid type
    expect(validateReferenceDataset(nonArray).ok).toBe(false);
  });

  it('rejects city order violations and meta count mismatches', () => {
    const dStr = '2026-11-15';
    const dayStart = istDayStartMs(dStr);
    const ds = {
      meta: {
        schemaVersion: 1,
        primary: 'skyfield',
        generator: {},
        conventions: 'test',
        imageDigest: 'digest',
        cityCount: 2,
        dayCount: 3, // mismatch with actual 2
        decisionDayCount: 5, // mismatch
        extendedDayCount: 5, // mismatch
        crossCheck: null,
        crossCheckReason: 'test',
      },
      cities: [
        {
          id: 'cityA',
          name: 'A',
          lat: 20,
          lon: 70,
          elevationM: 0,
          role: 'core',
        },
        {
          id: 'cityB',
          name: 'B',
          lat: 21,
          lon: 71,
          elevationM: 0,
          role: 'core',
        },
      ],
      days: [
        {
          c: 'cityB',
          d: dStr,
          s: 'decision',
          sunrise: dayStart + 3600000,
          moonrise: [],
          moonset: [],
          moonPhase: { fraction: 0.1, illumination: 0.2 },
        },
        {
          c: 'cityA', // out of city order (appeared after cityB)
          d: dStr,
          s: 'decision',
          sunrise: dayStart + 3600000,
          moonrise: [],
          moonset: [],
          moonPhase: { fraction: 0.1, illumination: 0.2 },
        },
      ],
    };
    const res = validateReferenceDataset(ds);
    expect(res.ok).toBe(false);
    expect(res.issues.some((i) => i.message.includes('not sorted by city order'))).toBe(true);
    expect(res.issues.some((i) => i.message.includes('meta.dayCount'))).toBe(true);
  });

  it('rejects core city with incomplete 2026 days when dayCount >= 2000', () => {
    const dStr = '2026-11-15';
    const dayStart = istDayStartMs(dStr);
    const days = [];
    for (let i = 0; i < 2000; i++) {
      days.push({
        c: 'cityA',
        d: dStr,
        s: 'decision',
        sunrise: dayStart + 3600000,
        moonrise: [],
        moonset: [],
        moonPhase: { fraction: 0.1, illumination: 0.2 },
      });
    }
    const ds = {
      meta: {
        schemaVersion: 1,
        primary: 'skyfield',
        generator: {},
        conventions: 'test',
        imageDigest: 'digest',
        cityCount: 1,
        dayCount: 2000,
        decisionDayCount: 2000,
        extendedDayCount: 0,
        crossCheck: null,
        crossCheckReason: 'test',
      },
      cities: [
        {
          id: 'cityA',
          name: 'A',
          lat: 20,
          lon: 70,
          elevationM: 0,
          role: 'core',
        },
      ],
      days,
    };
    const res = validateReferenceDataset(ds);
    expect(res.ok).toBe(false);
    expect(res.issues.some((i) => i.message.includes('has only 1 dates'))).toBe(true);
  });
});
