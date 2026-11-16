import { describe, expect, it } from 'vitest';
import {
  daysFromCivil,
  istDayEndMs,
  istDayStartMs,
  istNoonMs,
  parseCivilDate,
} from '../../lib/ist-day.mjs';

describe('ist-day', () => {
  it('ist-day helpers compute IST day boundaries without local time APIs', () => {
    // 1970-01-01 00:00:00 UTC is day 0
    expect(daysFromCivil(1970, 1, 1)).toBe(0);

    // 2000-01-01 is 10957 days from epoch
    expect(daysFromCivil(2000, 1, 1)).toBe(10957);

    // Parse civil date
    expect(parseCivilDate('2026-11-15')).toEqual({
      year: 2026,
      month: 11,
      day: 15,
    });

    // 2026-11-15 00:00:00 IST:
    // IST is UTC + 05:30 (+19,800,000 ms).
    // So 00:00:00 IST is 18:30:00 UTC on 2026-11-14.
    const startMs = istDayStartMs('2026-11-15');
    const endMs = istDayEndMs('2026-11-15');
    const noonMs = istNoonMs('2026-11-15');

    // Exactly 24 hours between start and end
    expect(endMs - startMs).toBe(86_400_000);

    // Noon is exactly 12 hours after start
    expect(noonMs - startMs).toBe(43_200_000);

    // Verification against Date.UTC (used only in test assertion, never in production code)
    // 2026-11-14 18:30:00 UTC
    const expectedStart = Date.UTC(2026, 10, 14, 18, 30, 0, 0);
    expect(startMs).toBe(expectedStart);

    // 2026-11-15 06:30:00 UTC (12:00:00 IST)
    const expectedNoon = Date.UTC(2026, 10, 15, 6, 30, 0, 0);
    expect(noonMs).toBe(expectedNoon);

    // Leap day test: 2028-02-29
    const leapStart = istDayStartMs('2028-02-29');
    const expectedLeapStart = Date.UTC(2028, 1, 28, 18, 30, 0, 0);
    expect(leapStart).toBe(expectedLeapStart);
  });

  it('handles negative era for far-past civil years', () => {
    expect(daysFromCivil(-400, 1, 1)).toBeTypeOf('number');
    expect(daysFromCivil(2000, 2, 29)).toBeTypeOf('number');
  });

  it('throws on invalid civil date strings', () => {
    expect(() => parseCivilDate('invalid')).toThrow(/Invalid civil date string/);
    expect(() => parseCivilDate('2026-ab-cd')).toThrow(/Invalid civil date values/);
  });
});
