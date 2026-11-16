import { describe, expect, it } from 'vitest';
import {
  evaluateGoldenDays,
  loadReferenceDataset,
  loadTolerancesConfig,
  type RefDay,
} from '../tests/astro/golden-helpers.js';

describe('astronomical golden tests (full set)', () => {
  const ref = loadReferenceDataset();
  const config = loadTolerancesConfig();

  const decisionDays: RefDay[] = ref.days.filter((d) => d.s === 'decision');
  const extendedDays: RefDay[] = ref.days.filter((d) => d.s === 'extended');

  const decisionEval = evaluateGoldenDays(decisionDays, ref.cities);
  const extendedEval = evaluateGoldenDays(extendedDays, ref.cities);

  it('golden full: sunrise sunset and twilight stay within the regression guard for every decision city-day', () => {
    expect(decisionEval.totalDays).toBe(2790);
    expect(decisionEval.maxErrors.sunriseSeconds).toBeLessThanOrEqual(
      config.regressionGuard.sunSeconds,
    );
    expect(decisionEval.maxErrors.sunsetSeconds).toBeLessThanOrEqual(
      config.regressionGuard.sunSeconds,
    );
    expect(decisionEval.maxErrors.twilightSeconds).toBeLessThanOrEqual(
      config.regressionGuard.sunSeconds,
    );
    expect(decisionEval.maxErrors.sunSeconds).toBeLessThanOrEqual(
      config.regressionGuard.sunSeconds,
    );
  });

  it('golden full: solar noon stays within the regression guard for every decision city-day', () => {
    expect(decisionEval.maxErrors.solarNoonSeconds).toBeLessThanOrEqual(
      config.regressionGuard.solarNoonSeconds,
    );
  });

  it('golden full: moon events stay within the regression guard and have no unmatched events away from IST day boundaries', () => {
    expect(decisionEval.maxErrors.moonSeconds).toBeLessThanOrEqual(
      config.regressionGuard.moonSeconds,
    );
    expect(decisionEval.unmatchedAwayFromBoundary.length).toBe(0);
  });

  it('golden full: moon phase and illumination stay within tolerance for every decision city-day', () => {
    expect(decisionEval.maxErrors.phaseFraction).toBeLessThanOrEqual(
      config.tolerances.phaseFraction,
    );
    expect(decisionEval.maxErrors.illumination).toBeLessThanOrEqual(config.tolerances.illumination);
  });

  it('golden full: processed every decision city-day and compared at least 24000 events', () => {
    expect(decisionEval.cityDays).toBe(2790);
    expect(decisionEval.eventsCompared).toBeGreaterThanOrEqual(24000);
  });

  it('golden extended: the 24 extended-range city-days stay within the extended guard', () => {
    expect(extendedEval.totalDays).toBe(24);
    expect(extendedEval.maxErrors.sunSeconds).toBeLessThanOrEqual(
      config.regressionGuard.extendedSeconds,
    );
    expect(extendedEval.maxErrors.solarNoonSeconds).toBeLessThanOrEqual(
      config.regressionGuard.extendedSeconds,
    );
    expect(extendedEval.maxErrors.moonSeconds).toBeLessThanOrEqual(
      config.regressionGuard.extendedSeconds,
    );
    expect(extendedEval.unmatchedAwayFromBoundary.length).toBe(0);
  });
});
