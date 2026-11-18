import { describe, expect, it } from 'vitest';
import type { DayRecord, SnapshotLocation, SnapshotV1 } from '@arunodaya/contracts';
import { interpolatePhase, livePhase, phaseName } from '../../src/moon/phase.js';
import { istDateToStartMs } from '../../src/time/ist.js';

const MOCK_LOCATION: SnapshotLocation = {
  lat: 22.3,
  lon: 70.8,
  label: 'Rajkot',
  source: 'manual',
  fixAtMs: 1763164800000,
};

function createMockDay(istDate: string, phase: number, illumination: number): DayRecord {
  return {
    istDate,
    sunrise: { exactMs: 1763254800000, displayMs: 1763254800000 },
    navkarshi: { exactMs: 1763257680000, displayMs: 1763257680000 },
    sunset: { exactMs: 1763294400000, displayMs: 1763294400000 },
    civilDawn: { exactMs: 1763253000000, displayMs: 1763253000000 },
    civilDusk: { exactMs: 1763296200000, displayMs: 1763296200000 },
    solarNoonMs: 1763274600000,
    goldenMorning: {
      start: { exactMs: 1763254800000, displayMs: 1763254800000 },
      end: { exactMs: 1763258400000, displayMs: 1763258400000 },
    },
    goldenEvening: {
      start: { exactMs: 1763290800000, displayMs: 1763290800000 },
      end: { exactMs: 1763294400000, displayMs: 1763294400000 },
    },
    moonPhaseAtNoon: {
      phase,
      illumination,
    },
  };
}

describe('Moon Phase Logic and Interpolation', () => {
  it('phaseName maps fraction 0.0 to new_moon', () => {
    expect(phaseName(0.0)).toBe('new_moon');
    expect(phaseName(0.02)).toBe('new_moon');
    expect(phaseName(0.98)).toBe('new_moon');
  });

  it('phaseName maps fraction 0.25 to first_quarter', () => {
    expect(phaseName(0.25)).toBe('first_quarter');
    expect(phaseName(0.24)).toBe('first_quarter');
    expect(phaseName(0.26)).toBe('first_quarter');
  });

  it('phaseName maps fraction 0.5 to full_moon', () => {
    expect(phaseName(0.5)).toBe('full_moon');
    expect(phaseName(0.48)).toBe('full_moon');
    expect(phaseName(0.52)).toBe('full_moon');
  });

  it('phaseName maps fraction 0.75 to third_quarter', () => {
    expect(phaseName(0.75)).toBe('third_quarter');
    expect(phaseName(0.74)).toBe('third_quarter');
    expect(phaseName(0.76)).toBe('third_quarter');
  });

  it('phaseName maps fraction 0.125 to waxing_crescent', () => {
    expect(phaseName(0.125)).toBe('waxing_crescent');
    expect(phaseName(0.1)).toBe('waxing_crescent');
    expect(phaseName(0.15)).toBe('waxing_crescent');
  });

  it('interpolatePhase wraps across 0.99 to 0.01 without backwards jump', () => {
    const a = { phase: 0.99, illumination: 0.01 };
    const b = { phase: 0.01, illumination: 0.02 };

    const mid = interpolatePhase(a, b, 0.5);
    // Shortest circular path crosses 0.00: 0.99 -> 0.00 -> 0.01 -> midpoint is 0.00
    expect(mid.fraction).toBeCloseTo(0.0, 4);
    expect(mid.illumination).toBeCloseTo(0.015, 4);
  });

  it('interpolatePhase at t=0 returns start phase', () => {
    const a = { phase: 0.2, illumination: 0.35 };
    const b = { phase: 0.3, illumination: 0.5 };
    const res = interpolatePhase(a, b, 0);
    expect(res.fraction).toBeCloseTo(0.2, 5);
    expect(res.illumination).toBeCloseTo(0.35, 5);
  });

  it('interpolatePhase at t=1 returns end phase', () => {
    const a = { phase: 0.2, illumination: 0.35 };
    const b = { phase: 0.3, illumination: 0.5 };
    const res = interpolatePhase(a, b, 1);
    expect(res.fraction).toBeCloseTo(0.3, 5);
    expect(res.illumination).toBeCloseTo(0.5, 5);
  });

  it('interpolatePhase at t=0.5 returns midpoint', () => {
    const a = { phase: 0.2, illumination: 0.3 };
    const b = { phase: 0.4, illumination: 0.7 };
    const res = interpolatePhase(a, b, 0.5);
    expect(res.fraction).toBeCloseTo(0.3, 5);
    expect(res.illumination).toBeCloseTo(0.5, 5);
  });

  it('livePhase returns current phase and illumination from snapshot', () => {
    const day1 = createMockDay('2026-11-16', 0.1, 0.3);
    const day2 = createMockDay('2026-11-17', 0.14, 0.42);

    const snapshot: SnapshotV1 = {
      schemaVersion: 1,
      engine: { name: 'astronomy-engine', version: '2.1.19' },
      generatedAtMs: 1763188200000,
      location: MOCK_LOCATION,
      days: [day1, day2],
      moonEvents: [],
    };

    // Calculate nowMs halfway between Day 1 noon and Day 2 noon
    const start1Res = istDateToStartMs('2026-11-16');
    expect(start1Res.ok).toBe(true);
    if (!start1Res.ok) return;

    const noon1Ms = start1Res.value + 12 * 3600_000;
    const testNowMs = noon1Ms + 6 * 3600_000; // 6 hours after day 1 noon

    const res = livePhase(snapshot, testNowMs);

    expect(res.isApproximate).toBe(false);
    expect(res.fraction).toBeGreaterThanOrEqual(0.1);
    expect(res.fraction).toBeLessThanOrEqual(0.14);
    expect(res.illumination).toBeGreaterThanOrEqual(0.3);
    expect(res.illumination).toBeLessThanOrEqual(0.42);
    expect(res.phaseKey).toBe('waxing_crescent');
  });

  it('livePhase marks approximate when snapshot days are insufficient', () => {
    const day1 = createMockDay('2026-11-16', 0.2, 0.3);
    const snapshot: SnapshotV1 = {
      schemaVersion: 1,
      engine: { name: 'astronomy-engine', version: '2.1.19' },
      generatedAtMs: 1763188200000,
      location: MOCK_LOCATION,
      days: [day1],
      moonEvents: [],
    };

    const res = livePhase(snapshot, 1763274600000);
    expect(res.isApproximate).toBe(true);
    expect(res.fraction).toBe(0.2);
    expect(res.illumination).toBe(0.3);

    const emptyRes = livePhase({ ...snapshot, days: [] }, 1763274600000);
    expect(emptyRes.isApproximate).toBe(true);
  });
});
