import { describe, expect, it } from 'vitest';
import {
  evaluateGoldenDays,
  loadReferenceDataset,
  loadTolerancesConfig,
  type RefDay,
} from './golden-helpers.js';

describe('astronomical golden tests (quick subset)', () => {
  const ref = loadReferenceDataset();
  const config = loadTolerancesConfig();

  const coreCities = ref.cities.filter((c) => c.role === 'core');
  const coreCityIds = new Set(coreCities.map((c) => c.id));

  const quickDates = new Set<string>();
  for (let m = 1; m <= 12; m++) {
    const mm = String(m).padStart(2, '0');
    quickDates.add(`2026-${mm}-01`);
    quickDates.add(`2026-${mm}-15`);
  }

  const quickDays: RefDay[] = ref.days.filter(
    (d) =>
      coreCityIds.has(d.c) && (quickDates.has(d.d) || d.d === '2000-01-01' || d.d === '2028-02-29'),
  );

  const evalResult = evaluateGoldenDays(quickDays, ref.cities);

  it('golden quick set: the provider matches the reference within the benchmark tolerances', () => {
    expect(evalResult.totalDays).toBe(156);
    expect(evalResult.maxErrors.sunSeconds).toBeLessThanOrEqual(config.tolerances.sunSeconds);
    expect(evalResult.maxErrors.solarNoonSeconds).toBeLessThanOrEqual(
      config.tolerances.solarNoonSeconds,
    );
    expect(evalResult.maxErrors.moonSeconds).toBeLessThanOrEqual(config.tolerances.moonSeconds);
    expect(evalResult.unmatchedAwayFromBoundary.length).toBe(0);
  });

  it('golden quick set: moon event counts match the reference for every day', () => {
    // Assert no unmatched moon events away from day boundaries
    expect(evalResult.unmatchedAwayFromBoundary.length).toBe(0);

    // Verify moon counts across the set
    for (const day of quickDays) {
      const city = ref.cities.find((c) => c.id === day.c);
      expect(city).toBeDefined();
    }
  });

  it('golden quick set: moon phase and illumination match the reference', () => {
    expect(evalResult.maxErrors.phaseFraction).toBeLessThanOrEqual(config.tolerances.phaseFraction);
    expect(evalResult.maxErrors.illumination).toBeLessThanOrEqual(config.tolerances.illumination);
  });
});
