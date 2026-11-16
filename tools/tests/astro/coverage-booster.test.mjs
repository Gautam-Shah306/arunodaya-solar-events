import { describe, expect, it } from 'vitest';
import {
  decideEngine,
  errorStats,
  matchEvents,
  scoreCandidate,
} from '../../lib/astro-benchmark.mjs';
import { TOLERANCES } from '../../lib/astro-tolerances.mjs';
import * as astronomyEngineAdapter from '../../lib/candidates/astronomy-engine.mjs';
import * as suncalcAdapter from '../../lib/candidates/suncalc.mjs';
import { daysFromCivil, istDayStartMs, parseCivilDate } from '../../lib/ist-day.mjs';
import {
  buildReferenceDockerArgs,
  extractForwardedFlags,
  readPythonImageFromToolchain,
} from '../../lib/reference-docker.mjs';
import { validateReferenceDataset } from '../../lib/reference-schema.mjs';

describe('Astro coverage booster', () => {
  describe('ist-day edge cases', () => {
    it('handles negative era for far-past civil years', () => {
      expect(daysFromCivil(-400, 1, 1)).toBeTypeOf('number');
      expect(daysFromCivil(2000, 2, 29)).toBeTypeOf('number');
    });

    it('throws on invalid civil date strings', () => {
      expect(() => parseCivilDate('invalid')).toThrow(/Invalid civil date string/);
      expect(() => parseCivilDate('2026-ab-cd')).toThrow(/Invalid civil date values/);
    });
  });

  describe('reference-docker edge cases', () => {
    it('extractForwardedFlags handles arrays without double dash', () => {
      expect(extractForwardedFlags(['--flag', 'val'])).toEqual(['--flag', 'val']);
    });

    it('readPythonImageFromToolchain throws when file is missing', () => {
      expect(() => readPythonImageFromToolchain('nonexistent-path.md')).toThrow(
        /Toolchain document not found/,
      );
    });

    it('buildReferenceDockerArgs throws when image cannot be resolved', () => {
      expect(() =>
        buildReferenceDockerArgs({
          repoRoot: 'C:/repo',
          pythonImage: '',
          toolchainPath: 'nonexistent-path.md',
        }),
      ).toThrow();
    });

    it('buildReferenceDockerArgs throws if arg contains double quote', () => {
      expect(() =>
        buildReferenceDockerArgs({
          repoRoot: 'C:/repo',
          pythonImage: 'python:3.12-slim@sha256:1234',
          forwardedFlags: ['--bad="flag"'],
        }),
      ).toThrow(/contains forbidden double quote/);
    });
  });

  describe('reference-schema comprehensive validation branches', () => {
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
      // Create 2000 dummy days for cityA
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

  describe('astro-benchmark edge cases', () => {
    it('handles empty or null events in matchEvents', () => {
      expect(matchEvents(null, null).pairs).toHaveLength(0);
      expect(matchEvents(100, null).unmatchedRef).toEqual([100]);
      expect(matchEvents(null, 200).extraCand).toEqual([200]);
    });

    it('errorStats handles empty input', () => {
      expect(errorStats([])).toEqual({ n: 0, maxAbs: 0, mean: 0, p95: 0 });
    });

    it('decideEngine handles single candidate passing', () => {
      const scores = {
        candA: {
          allPassed: true,
          maxSunError: 3.5,
        },
        candB: {
          allPassed: false,
          maxSunError: 99.0,
        },
      };
      const res = decideEngine(scores);
      expect(res.chosen).toBe('candA');
      expect(res.reasons[0]).toContain('candB failed');
    });

    it('decideEngine handles multiple passing candidates with diff >= 1.0s', () => {
      const scores = {
        candA: {
          allPassed: true,
          maxSunError: 2.0,
        },
        candB: {
          allPassed: true,
          maxSunError: 8.0,
        },
      };
      const res = decideEngine(scores);
      expect(res.chosen).toBe('candA');
      expect(res.reasons.some((r) => r.includes('lowest maximum sun error'))).toBe(true);
    });

    it('decideEngine tiebreak when astronomy-engine is not in the tie', () => {
      const scores = {
        candX: {
          allPassed: true,
          maxSunError: 2.1,
        },
        candY: {
          allPassed: true,
          maxSunError: 2.3,
        },
      };
      const res = decideEngine(scores);
      expect(res.chosen).toBe('candX');
    });

    it('scoreCandidate with extended set populates byYear', () => {
      const dStr = '2035-03-20';
      const dayStart = istDayStartMs(dStr);
      const noon = dayStart + 12 * 3600 * 1000;
      const ds = {
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
            s: 'extended',
            sunrise: noon - 6 * 3600 * 1000,
            sunset: noon + 6 * 3600 * 1000,
            solarNoon: noon,
            civilDawn: noon - 6.5 * 3600 * 1000,
            civilDusk: noon + 6.5 * 3600 * 1000,
            sun6Morning: noon - 5.5 * 3600 * 1000,
            sun6Evening: noon + 5.5 * 3600 * 1000,
            moonrise: [noon - 2 * 3600 * 1000],
            moonset: [noon + 2 * 3600 * 1000],
            moonPhase: { fraction: 0.2, illumination: 0.3 },
          },
        ],
      };

      const cand = {
        id: 'test-cand',
        computeDay: () => ({
          sunrise: noon - 6 * 3600 * 1000 + 5000,
          sunset: noon + 6 * 3600 * 1000 + 5000,
          solarNoon: noon + 1000,
          civilDawn: noon - 6.5 * 3600 * 1000,
          civilDusk: noon + 6.5 * 3600 * 1000,
          sun6Morning: noon - 5.5 * 3600 * 1000,
          sun6Evening: noon + 5.5 * 3600 * 1000,
          moonrise: [noon - 2 * 3600 * 1000],
          moonset: [noon + 2 * 3600 * 1000],
          moonPhase: { fraction: 0.2, illumination: 0.3 },
        }),
      };

      const score = scoreCandidate(ds, cand, TOLERANCES);
      expect(score.extendedByYear['2035']).toBeDefined();
      expect(score.extendedByYear['2035'].length).toBeGreaterThan(0);
    });
  });

  describe('candidate adapters diverse date coverage', () => {
    it('exercises candidate edge branches across seasons and cities', () => {
      const dates = ['2026-06-21', '2026-12-21', '2000-01-01', '2028-02-29'];
      const cities = [
        { id: 'leh', lat: 34.16, lon: 77.58, elevationM: 3500 },
        { id: 'kanyakumari', lat: 8.08, lon: 77.54, elevationM: 10 },
      ];

      for (const city of cities) {
        for (const d of dates) {
          const resAstro = astronomyEngineAdapter.computeDay(city, d);
          expect(resAstro.sunrise).toBeTypeOf('number');
          expect(resAstro.sunset).toBeTypeOf('number');

          const resSun = suncalcAdapter.computeDay(city, d);
          expect(resSun.sunrise).toBeTypeOf('number');
          expect(resSun.sunset).toBeTypeOf('number');
        }
      }
    });
  });
});
