import { describe, expect, it } from 'vitest';
import * as astronomyEngineAdapter from '../../lib/candidates/astronomy-engine.mjs';
import * as suncalcAdapter from '../../lib/candidates/suncalc.mjs';
import { istDayEndMs, istDayStartMs } from '../../lib/ist-day.mjs';

const rajkot = { id: 'rajkot', lat: 22.3, lon: 70.8, elevationM: 130 };

describe('astro candidates', () => {
  it('astronomy-engine candidate returns sunrise sunset and noon for Rajkot on 2026-11-15', () => {
    const res = astronomyEngineAdapter.computeDay(rajkot, '2026-11-15');
    expect(res.sunrise).toBeTypeOf('number');
    expect(res.sunset).toBeTypeOf('number');
    expect(res.solarNoon).toBeTypeOf('number');
    expect(res.sunrise).toBeLessThan(res.solarNoon);
    expect(res.solarNoon).toBeLessThan(res.sunset);
  });

  it('suncalc candidate returns sunrise sunset and noon for Rajkot on 2026-11-15', () => {
    const res = suncalcAdapter.computeDay(rajkot, '2026-11-15');
    expect(res.sunrise).toBeTypeOf('number');
    expect(res.sunset).toBeTypeOf('number');
    expect(res.solarNoon).toBeTypeOf('number');
    expect(res.sunrise).toBeLessThan(res.solarNoon);
    expect(res.solarNoon).toBeLessThan(res.sunset);
  });

  it('candidates attribute moon events to the IST day', () => {
    const dStr = '2026-11-15';
    const dayStart = istDayStartMs(dStr);
    const dayEnd = istDayEndMs(dStr);

    for (const cand of [astronomyEngineAdapter, suncalcAdapter]) {
      const res = cand.computeDay(rajkot, dStr);
      for (const m of res.moonrise) {
        expect(m).toBeGreaterThanOrEqual(dayStart);
        expect(m).toBeLessThan(dayEnd);
      }
      for (const m of res.moonset) {
        expect(m).toBeGreaterThanOrEqual(dayStart);
        expect(m).toBeLessThan(dayEnd);
      }
    }
  });
});
