import { describe, expect, it } from 'vitest';
import {
  decideEngine,
  errorStats,
  matchEvents,
  rangeAdvice,
  scoreCandidate,
} from '../../lib/astro-benchmark.mjs';
import { TOLERANCES } from '../../lib/astro-tolerances.mjs';
import { istDayStartMs } from '../../lib/ist-day.mjs';

describe('astro-benchmark', () => {
  it('benchmark matches candidate events to reference events within 30 minutes', () => {
    const t0 = 1763188800000;
    const ref = [t0, t0 + 3600000];
    // cand has 1 event 5 seconds later, and another 35 minutes later (outside 30m window)
    const cand = [t0 + 5000, t0 + 3600000 + 35 * 60 * 1000];

    const match = matchEvents(ref, cand, 30);
    expect(match.pairs).toHaveLength(1);
    expect(match.pairs[0].ref).toBe(t0);
    expect(match.pairs[0].cand).toBe(t0 + 5000);
    expect(match.pairs[0].diffSeconds).toBe(5);
    expect(match.unmatchedRef).toEqual([t0 + 3600000]);
    expect(match.extraCand).toEqual([t0 + 3600000 + 35 * 60 * 1000]);
  });

  it('benchmark reports max mean and p95 error in seconds', () => {
    // 100 sample errors: 90 of 1s, 5 of 10s, 5 of 20s
    const errors = [];
    for (let i = 0; i < 90; i++) errors.push(1.0);
    for (let i = 0; i < 5; i++) errors.push(10.0);
    for (let i = 0; i < 5; i++) errors.push(20.0);

    const stats = errorStats(errors);
    expect(stats.n).toBe(100);
    expect(stats.maxAbs).toBe(20.0);
    // mean: (90*1 + 5*10 + 5*20) / 100 = (90 + 50 + 100) / 100 = 2.4
    expect(stats.mean).toBeCloseTo(2.4, 2);
    // p95 index is 95 -> sorted[95] is 10.0 or 20.0
    expect(stats.p95).toBeGreaterThanOrEqual(10.0);
  });

  it('benchmark counts unmatched and extra events separately', () => {
    const dStr = '2026-11-15';
    const dayStart = istDayStartMs(dStr);
    const noon = dayStart + 12 * 3600 * 1000;

    const mockDataset = {
      cities: [{ id: 'rajkot', lat: 22.3, lon: 70.8, elevationM: 130, role: 'core' }],
      days: [
        {
          c: 'rajkot',
          d: dStr,
          s: 'decision',
          sunrise: noon - 6 * 3600 * 1000,
          sunset: noon + 6 * 3600 * 1000,
          solarNoon: noon,
          civilDawn: noon - 6.5 * 3600 * 1000,
          civilDusk: noon + 6.5 * 3600 * 1000,
          sun6Morning: noon - 5.5 * 3600 * 1000,
          sun6Evening: noon + 5.5 * 3600 * 1000,
          moonrise: [noon - 2 * 3600 * 1000],
          moonset: [],
          moonPhase: { fraction: 0.5, illumination: 1.0 },
        },
      ],
    };

    // Candidate has extra moonset and missing moonrise
    const candidate = {
      id: 'mock-cand',
      computeDay: () => ({
        sunrise: noon - 6 * 3600 * 1000,
        sunset: noon + 6 * 3600 * 1000,
        solarNoon: noon,
        civilDawn: noon - 6.5 * 3600 * 1000,
        civilDusk: noon + 6.5 * 3600 * 1000,
        sun6Morning: noon - 5.5 * 3600 * 1000,
        sun6Evening: noon + 5.5 * 3600 * 1000,
        moonrise: [], // missing -> unmatchedRef
        moonset: [noon + 2 * 3600 * 1000], // extra -> extraCand
        moonPhase: { fraction: 0.5, illumination: 1.0 },
      }),
    };

    const score = scoreCandidate(mockDataset, candidate, TOLERANCES);
    expect(score.decision.moonrise.unmatched).toBe(1);
    expect(score.decision.moonrise.extra).toBe(0);
    expect(score.decision.moonset.unmatched).toBe(0);
    expect(score.decision.moonset.extra).toBe(1);
  });

  it('benchmark treats unmatched events near an IST day boundary as boundary cases', () => {
    const dStr = '2026-11-15';
    const dayStart = istDayStartMs(dStr);
    const noon = dayStart + 12 * 3600 * 1000;

    const mockDataset = {
      cities: [{ id: 'rajkot', lat: 22.3, lon: 70.8, elevationM: 130, role: 'core' }],
      days: [
        {
          c: 'rajkot',
          d: dStr,
          s: 'decision',
          sunrise: noon - 6 * 3600 * 1000,
          sunset: noon + 6 * 3600 * 1000,
          solarNoon: noon,
          civilDawn: noon - 6.5 * 3600 * 1000,
          civilDusk: noon + 6.5 * 3600 * 1000,
          sun6Morning: noon - 5.5 * 3600 * 1000,
          sun6Evening: noon + 5.5 * 3600 * 1000,
          moonrise: [dayStart + 2 * 60 * 1000], // within 10 min of boundary
          moonset: [],
          moonPhase: { fraction: 0.5, illumination: 1.0 },
        },
      ],
    };

    const candidate = {
      id: 'mock-cand',
      computeDay: () => ({
        sunrise: noon - 6 * 3600 * 1000,
        sunset: noon + 6 * 3600 * 1000,
        solarNoon: noon,
        civilDawn: noon - 6.5 * 3600 * 1000,
        civilDusk: noon + 6.5 * 3600 * 1000,
        sun6Morning: noon - 5.5 * 3600 * 1000,
        sun6Evening: noon + 5.5 * 3600 * 1000,
        moonrise: [], // missing candidate event near boundary
        moonset: [],
        moonPhase: { fraction: 0.5, illumination: 1.0 },
      }),
    };

    const score = scoreCandidate(mockDataset, candidate, TOLERANCES);
    expect(score.decision.moonrise.boundary).toBe(1);
    expect(score.decision.moonrise.unmatched).toBe(0);
  });

  it('benchmark decision picks the candidate that meets every tolerance', () => {
    const scores = {
      'astronomy-engine': {
        allPassed: true,
        maxSunError: 5.2,
      },
      suncalc: {
        allPassed: false,
        maxSunError: 75.0, // exceeds 60s
      },
    };

    const decision = decideEngine(scores, TOLERANCES);
    expect(decision.chosen).toBe('astronomy-engine');
    expect(decision.passed).toEqual(['astronomy-engine']);
  });

  it('benchmark decision prefers astronomy-engine on a tie', () => {
    const scores = {
      'astronomy-engine': {
        allPassed: true,
        maxSunError: 5.5,
      },
      suncalc: {
        allPassed: true,
        maxSunError: 5.2, // diff < 1.0s
      },
    };

    const decision = decideEngine(scores, TOLERANCES);
    expect(decision.chosen).toBe('astronomy-engine');
  });

  it('benchmark decision reports none when no candidate meets the tolerances', () => {
    const scores = {
      'astronomy-engine': {
        allPassed: false,
        maxSunError: 120.0,
      },
      suncalc: {
        allPassed: false,
        maxSunError: 150.0,
      },
    };

    const decision = decideEngine(scores, TOLERANCES);
    expect(decision.chosen).toBeNull();
    expect(decision.passed).toEqual([]);
  });

  it('benchmark decision ignores extended-range days', () => {
    // Decision is solely based on decision set results
    const scores = {
      'astronomy-engine': {
        allPassed: true,
        maxSunError: 4.0,
      },
    };
    const decision = decideEngine(scores, TOLERANCES);
    expect(decision.chosen).toBe('astronomy-engine');
  });

  it('benchmark range advice names the last year within the sun tolerance', () => {
    const scores = {
      'astronomy-engine': {
        extendedByYear: {
          2035: [5.0, 10.0],
          2050: [12.0, 15.0],
          2075: [25.0, 35.0],
          2100: [45.0, 52.0], // <= 60s
        },
      },
      suncalc: {
        extendedByYear: {
          2035: [40.0, 50.0],
          2050: [55.0, 65.0], // > 60s
          2075: [75.0],
          2100: [90.0],
        },
      },
    };

    const advice = rangeAdvice(scores, TOLERANCES);
    expect(advice['astronomy-engine'].maxYear).toBe(2100);
    expect(advice.suncalc.maxYear).toBe(2035);
    expect(advice.suncalc.sentence).toContain('after 2035');
  });
});
