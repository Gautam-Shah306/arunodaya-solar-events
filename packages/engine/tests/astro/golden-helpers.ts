import fs from 'node:fs';
import path from 'node:path';
import { istDateToStartMs, MS_PER_DAY } from '../../src/time/ist.js';
import { computeAstroDay } from '../../src/astro/astro-day.js';

export interface RefCity {
  id: string;
  name: string;
  lat: number;
  lon: number;
  elevationM?: number;
  role?: string;
}

export interface RefDay {
  c: string;
  d: string;
  s: string;
  sunrise: number;
  sunset: number;
  solarNoon: number;
  civilDawn: number;
  civilDusk: number;
  sun6Morning: number;
  sun6Evening: number;
  moonrise: number[];
  moonset: number[];
  moonPhase: {
    fraction: number;
    illumination: number;
  };
}

export interface RefDataset {
  cities: RefCity[];
  days: RefDay[];
  meta: Record<string, unknown>;
}

export interface TolerancesConfig {
  tolerances: {
    sunSeconds: number;
    solarNoonSeconds: number;
    moonSeconds: number;
    phaseFraction: number;
    illumination: number;
    crossCheckSunSeconds: number;
    crossCheckMoonSeconds: number;
  };
  regressionGuard: {
    sunSeconds: number;
    solarNoonSeconds: number;
    moonSeconds: number;
    extendedSeconds: number;
  };
}

export interface GoldenEvaluationResult {
  totalDays: number;
  maxErrors: {
    sunSeconds: number;
    solarNoonSeconds: number;
    twilightSeconds: number;
    moonSeconds: number;
    phaseFraction: number;
    illumination: number;
    sunriseSeconds: number;
    sunsetSeconds: number;
    civilDawnSeconds: number;
    civilDuskSeconds: number;
    sun6MorningSeconds: number;
    sun6EveningSeconds: number;
  };
  boundaryCases: Array<{ city: string; date: string; kind: string; time: number }>;
  unmatchedAwayFromBoundary: Array<{ city: string; date: string; kind: string; time: number }>;
}

/**
 * Type guard for RefDataset structure.
 */
function isRefDataset(value: unknown): value is RefDataset {
  if (!value || typeof value !== 'object') return false;
  const obj = value as Record<string, unknown>;
  return Array.isArray(obj.cities) && Array.isArray(obj.days);
}

/**
 * Type guard for TolerancesConfig structure.
 */
function isTolerancesConfig(value: unknown): value is TolerancesConfig {
  if (!value || typeof value !== 'object') return false;
  const obj = value as Record<string, unknown>;
  return (
    typeof obj.tolerances === 'object' &&
    obj.tolerances !== null &&
    typeof obj.regressionGuard === 'object' &&
    obj.regressionGuard !== null
  );
}

/**
 * Loads the committed astronomical reference dataset.
 */
export function loadReferenceDataset(customPath?: string): RefDataset {
  const filePath =
    customPath ?? path.resolve(process.cwd(), 'packages/engine/tests/data/astro-reference-v1.json');
  const raw = fs.readFileSync(filePath, 'utf8');
  const parsed = JSON.parse(raw) as unknown;
  if (!isRefDataset(parsed)) {
    throw new TypeError(`Invalid astronomical reference dataset at: ${filePath}`);
  }
  return parsed;
}

/**
 * Loads the shared astronomical tolerances configuration.
 */
export function loadTolerancesConfig(customPath?: string): TolerancesConfig {
  const filePath =
    customPath ??
    path.resolve(process.cwd(), 'packages/engine/tests/data/astro-tolerances-v1.json');
  const raw = fs.readFileSync(filePath, 'utf8');
  const parsed = JSON.parse(raw) as unknown;
  if (!isTolerancesConfig(parsed)) {
    throw new TypeError(`Invalid astronomical tolerances config at: ${filePath}`);
  }
  return parsed;
}

/**
 * Evaluates the production astronomy provider against reference days.
 * Matches nearest events within 30 minutes.
 * Events within 10 minutes of an IST day boundary are treated as boundary cases.
 */
export function evaluateGoldenDays(
  days: readonly RefDay[],
  cities: readonly RefCity[],
): GoldenEvaluationResult {
  const citiesMap = new Map<string, RefCity>(cities.map((c) => [c.id, c]));

  let maxSunrise = 0;
  let maxSunset = 0;
  let maxSolarNoon = 0;
  let maxCivilDawn = 0;
  let maxCivilDusk = 0;
  let maxSun6M = 0;
  let maxSun6E = 0;
  let maxMoon = 0;
  let maxPhase = 0;
  let maxIllum = 0;

  const boundaryCases: Array<{ city: string; date: string; kind: string; time: number }> = [];
  const unmatchedAwayFromBoundary: Array<{
    city: string;
    date: string;
    kind: string;
    time: number;
  }> = [];

  const MATCH_WINDOW_MS = 30 * 60 * 1000; // 30 minutes
  const BOUNDARY_MARGIN_MS = 10 * 60 * 1000; // 10 minutes

  for (const day of days) {
    const city = citiesMap.get(day.c);
    if (!city) {
      throw new Error(`Unknown city id: ${day.c}`);
    }

    const res = computeAstroDay({ lat: city.lat, lon: city.lon }, day.d);
    if (!res.ok) {
      throw new Error(`computeAstroDay failed for ${day.c} on ${day.d}: ${res.error.message}`);
    }

    const prov = res.value;

    const sunriseErr = Math.abs(prov.sunrise - day.sunrise) / 1000;
    const sunsetErr = Math.abs(prov.sunset - day.sunset) / 1000;
    const noonErr = Math.abs(prov.solarNoon - day.solarNoon) / 1000;
    const dawnErr = Math.abs(prov.civilDawn - day.civilDawn) / 1000;
    const duskErr = Math.abs(prov.civilDusk - day.civilDusk) / 1000;
    const sun6MErr = Math.abs(prov.sun6Morning - day.sun6Morning) / 1000;
    const sun6EErr = Math.abs(prov.sun6Evening - day.sun6Evening) / 1000;

    maxSunrise = Math.max(maxSunrise, sunriseErr);
    maxSunset = Math.max(maxSunset, sunsetErr);
    maxSolarNoon = Math.max(maxSolarNoon, noonErr);
    maxCivilDawn = Math.max(maxCivilDawn, dawnErr);
    maxCivilDusk = Math.max(maxCivilDusk, duskErr);
    maxSun6M = Math.max(maxSun6M, sun6MErr);
    maxSun6E = Math.max(maxSun6E, sun6EErr);

    const phaseErr = Math.abs(prov.moonPhase.fraction - day.moonPhase.fraction);
    const illumErr = Math.abs(prov.moonPhase.illumination - day.moonPhase.illumination);
    maxPhase = Math.max(maxPhase, phaseErr);
    maxIllum = Math.max(maxIllum, illumErr);

    // Resolve day bounds
    const dayStartRes = istDateToStartMs(day.d);
    if (!dayStartRes.ok) {
      throw new Error(`Failed to resolve day start for ${day.d}`);
    }
    const dayStart = dayStartRes.value;
    const dayEnd = dayStart + MS_PER_DAY;

    const isNearBoundary = (t: number) =>
      t - dayStart < BOUNDARY_MARGIN_MS || dayEnd - t < BOUNDARY_MARGIN_MS;

    // Match moonrise
    const provRise = [...prov.moonrise];
    for (const refRise of day.moonrise) {
      let bestIdx = -1;
      let bestDiff = MATCH_WINDOW_MS + 1;
      for (let i = 0; i < provRise.length; i++) {
        const cand = provRise[i];
        if (cand === undefined) continue;
        const diff = Math.abs(cand - refRise);
        if (diff <= MATCH_WINDOW_MS && diff < bestDiff) {
          bestDiff = diff;
          bestIdx = i;
        }
      }
      if (bestIdx >= 0) {
        maxMoon = Math.max(maxMoon, bestDiff / 1000);
        provRise.splice(bestIdx, 1);
      } else {
        if (isNearBoundary(refRise)) {
          boundaryCases.push({ city: day.c, date: day.d, kind: 'moonrise_ref', time: refRise });
        } else {
          unmatchedAwayFromBoundary.push({
            city: day.c,
            date: day.d,
            kind: 'moonrise_ref',
            time: refRise,
          });
        }
      }
    }

    // Remaining computed moonrise
    for (const extraRise of provRise) {
      if (isNearBoundary(extraRise)) {
        boundaryCases.push({ city: day.c, date: day.d, kind: 'moonrise_prov', time: extraRise });
      } else {
        unmatchedAwayFromBoundary.push({
          city: day.c,
          date: day.d,
          kind: 'moonrise_prov',
          time: extraRise,
        });
      }
    }

    // Match moonset
    const provSet = [...prov.moonset];
    for (const refSet of day.moonset) {
      let bestIdx = -1;
      let bestDiff = MATCH_WINDOW_MS + 1;
      for (let i = 0; i < provSet.length; i++) {
        const cand = provSet[i];
        if (cand === undefined) continue;
        const diff = Math.abs(cand - refSet);
        if (diff <= MATCH_WINDOW_MS && diff < bestDiff) {
          bestDiff = diff;
          bestIdx = i;
        }
      }
      if (bestIdx >= 0) {
        maxMoon = Math.max(maxMoon, bestDiff / 1000);
        provSet.splice(bestIdx, 1);
      } else {
        if (isNearBoundary(refSet)) {
          boundaryCases.push({ city: day.c, date: day.d, kind: 'moonset_ref', time: refSet });
        } else {
          unmatchedAwayFromBoundary.push({
            city: day.c,
            date: day.d,
            kind: 'moonset_ref',
            time: refSet,
          });
        }
      }
    }

    for (const extraSet of provSet) {
      if (isNearBoundary(extraSet)) {
        boundaryCases.push({ city: day.c, date: day.d, kind: 'moonset_prov', time: extraSet });
      } else {
        unmatchedAwayFromBoundary.push({
          city: day.c,
          date: day.d,
          kind: 'moonset_prov',
          time: extraSet,
        });
      }
    }
  }

  const twilightSeconds = Math.max(maxCivilDawn, maxCivilDusk, maxSun6M, maxSun6E);
  const sunSeconds = Math.max(maxSunrise, maxSunset, twilightSeconds);

  return {
    totalDays: days.length,
    maxErrors: {
      sunSeconds,
      solarNoonSeconds: maxSolarNoon,
      twilightSeconds,
      moonSeconds: maxMoon,
      phaseFraction: maxPhase,
      illumination: maxIllum,
      sunriseSeconds: maxSunrise,
      sunsetSeconds: maxSunset,
      civilDawnSeconds: maxCivilDawn,
      civilDuskSeconds: maxCivilDusk,
      sun6MorningSeconds: maxSun6M,
      sun6EveningSeconds: maxSun6E,
    },
    boundaryCases,
    unmatchedAwayFromBoundary,
  };
}
