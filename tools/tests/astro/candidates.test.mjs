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

  it('candidates compute all events across diverse seasons and extreme latitudes', () => {
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
        expect(resAstro.solarNoon).toBeTypeOf('number');

        const resSun = suncalcAdapter.computeDay(city, d);
        expect(resSun.sunrise).toBeTypeOf('number');
        expect(resSun.sunset).toBeTypeOf('number');
        expect(resSun.solarNoon).toBeTypeOf('number');
      }
    }
  });
});
