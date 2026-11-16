// @ts-nocheck
import { istDayEndMs, istDayStartMs } from './ist-day.mjs';

const SUN_KINDS = ['sunrise', 'sunset', 'civilDawn', 'civilDusk', 'sun6Morning', 'sun6Evening'];

const MOON_KINDS = ['moonrise', 'moonset'];

/**
 * Greedily matches reference events to candidate events within a window.
 * @param {number|number[]|null} reference
 * @param {number|number[]|null} candidate
 * @param {number} [windowMinutes=30]
 * @returns {{ pairs: Array<{ ref: number, cand: number, diffSeconds: number }>, unmatchedRef: number[], extraCand: number[] }}
 */
export function matchEvents(reference, candidate, windowMinutes = 30) {
  const windowMs = windowMinutes * 60 * 1000;
  const refList = (
    Array.isArray(reference)
      ? reference
      : reference !== null && reference !== undefined
        ? [reference]
        : []
  ).slice();
  const candList = (
    Array.isArray(candidate)
      ? candidate
      : candidate !== null && candidate !== undefined
        ? [candidate]
        : []
  ).slice();

  const possiblePairs = [];
  for (let rIdx = 0; rIdx < refList.length; rIdx++) {
    for (let cIdx = 0; cIdx < candList.length; cIdx++) {
      const diff = Math.abs(candList[cIdx] - refList[rIdx]);
      if (diff <= windowMs) {
        possiblePairs.push({
          rIdx,
          cIdx,
          diff,
          signedDiffSec: (candList[cIdx] - refList[rIdx]) / 1000,
        });
      }
    }
  }

  // Sort pairs by absolute time difference ascending
  possiblePairs.sort((a, b) => a.diff - b.diff);

  const usedR = new Set();
  const usedC = new Set();
  const pairs = [];

  for (const p of possiblePairs) {
    if (!usedR.has(p.rIdx) && !usedC.has(p.cIdx)) {
      usedR.add(p.rIdx);
      usedC.add(p.cIdx);
      pairs.push({
        ref: refList[p.rIdx],
        cand: candList[p.cIdx],
        diffSeconds: p.signedDiffSec,
      });
    }
  }

  const unmatchedRef = [];
  for (let rIdx = 0; rIdx < refList.length; rIdx++) {
    if (!usedR.has(rIdx)) unmatchedRef.push(refList[rIdx]);
  }

  const extraCand = [];
  for (let cIdx = 0; cIdx < candList.length; cIdx++) {
    if (!usedC.has(cIdx)) extraCand.push(candList[cIdx]);
  }

  return { pairs, unmatchedRef, extraCand };
}

/**
 * Computes descriptive error statistics: n, maxAbs, mean, p95.
 * @param {number[]} errorsSeconds
 * @returns {{ n: number, maxAbs: number, mean: number, p95: number }}
 */
export function errorStats(errorsSeconds) {
  if (!errorsSeconds || errorsSeconds.length === 0) {
    return { n: 0, maxAbs: 0, mean: 0, p95: 0 };
  }

  const n = errorsSeconds.length;
  const absErrors = errorsSeconds.map((e) => Math.abs(e));
  const maxAbs = Math.max(...absErrors);
  const sumAbs = absErrors.reduce((a, b) => a + b, 0);
  const mean = sumAbs / n;

  const sorted = absErrors.slice().sort((a, b) => a - b);
  const p95Index = Math.min(Math.floor(n * 0.95), n - 1);
  const p95 = sorted[p95Index];

  return { n, maxAbs, mean, p95 };
}

/**
 * Scores an astronomical candidate adapter against the reference dataset.
 *
 * @param {object} dataset
 * @param {object} candidate
 * @param {object} tolerances
 * @returns {object}
 */
export function scoreCandidate(dataset, candidate, tolerances) {
  const cityMap = new Map();
  for (const city of dataset.cities) {
    cityMap.set(city.id, city);
  }

  const sets = {
    decision: {
      diffs: {},
      unmatched: {},
      extra: {},
      boundary: {},
    },
    extended: {
      diffs: {},
      unmatched: {},
      extra: {},
      boundary: {},
      byYear: {},
    },
  };

  const allKinds = [...SUN_KINDS, 'solarNoon', ...MOON_KINDS, 'phaseFraction', 'illumination'];

  for (const setKey of ['decision', 'extended']) {
    for (const kind of allKinds) {
      sets[setKey].diffs[kind] = [];
      sets[setKey].unmatched[kind] = 0;
      sets[setKey].extra[kind] = 0;
      sets[setKey].boundary[kind] = 0;
    }
  }

  const boundaryWindowMs = 10 * 60 * 1000;

  for (const day of dataset.days) {
    const setKey = day.s; // 'decision' or 'extended'
    const targetSet = sets[setKey];
    if (!targetSet) continue;

    const city = cityMap.get(day.c) || {
      id: day.c,
      lat: 0,
      lon: 0,
      elevationM: 0,
    };
    const cand = candidate.computeDay(city, day.d);

    const dayStart = istDayStartMs(day.d);
    const dayEnd = istDayEndMs(day.d);

    function isNearBoundary(ms) {
      return (
        Math.abs(ms - dayStart) <= boundaryWindowMs || Math.abs(ms - dayEnd) <= boundaryWindowMs
      );
    }

    // 1. Single sun events & solar noon
    for (const kind of [...SUN_KINDS, 'solarNoon']) {
      const refVal = day[kind];
      const candVal = cand[kind];

      const match = matchEvents(refVal, candVal, 30);
      for (const p of match.pairs) {
        targetSet.diffs[kind].push(p.diffSeconds);
      }
      for (const unmatched of match.unmatchedRef) {
        if (isNearBoundary(unmatched)) {
          targetSet.boundary[kind]++;
        } else {
          targetSet.unmatched[kind]++;
        }
      }
      for (const extra of match.extraCand) {
        if (isNearBoundary(extra)) {
          targetSet.boundary[kind]++;
        } else {
          targetSet.extra[kind]++;
        }
      }

      // Track by year for extended set
      if (setKey === 'extended') {
        const year = day.d.substring(0, 4);
        if (!targetSet.byYear[year]) targetSet.byYear[year] = [];
        for (const p of match.pairs) {
          if (SUN_KINDS.includes(kind)) {
            targetSet.byYear[year].push(Math.abs(p.diffSeconds));
          }
        }
      }
    }

    // 2. Moon events
    for (const kind of MOON_KINDS) {
      const refArr = day[kind];
      const candArr = cand[kind];

      const match = matchEvents(refArr, candArr, 30);
      for (const p of match.pairs) {
        targetSet.diffs[kind].push(p.diffSeconds);
      }
      for (const unmatched of match.unmatchedRef) {
        if (isNearBoundary(unmatched)) {
          targetSet.boundary[kind]++;
        } else {
          targetSet.unmatched[kind]++;
        }
      }
      for (const extra of match.extraCand) {
        if (isNearBoundary(extra)) {
          targetSet.boundary[kind]++;
        } else {
          targetSet.extra[kind]++;
        }
      }
    }

    // 3. Moon phase
    if (day.moonPhase && cand.moonPhase) {
      // Fraction wrap-around diff in [0, 1)
      let fracDiff = Math.abs(day.moonPhase.fraction - cand.moonPhase.fraction);
      if (fracDiff > 0.5) fracDiff = 1.0 - fracDiff;
      targetSet.diffs.phaseFraction.push(fracDiff);

      const illumDiff = Math.abs(day.moonPhase.illumination - cand.moonPhase.illumination);
      targetSet.diffs.illumination.push(illumDiff);
    }
  }

  // Compile stats
  function compileSetStats(setObj) {
    const table = {};
    for (const kind of allKinds) {
      const stats = errorStats(setObj.diffs[kind]);
      let tol = tolerances.sunSeconds;
      if (kind === 'solarNoon') tol = tolerances.solarNoonSeconds;
      else if (MOON_KINDS.includes(kind)) tol = tolerances.moonSeconds;
      else if (kind === 'phaseFraction') tol = tolerances.phaseFraction;
      else if (kind === 'illumination') tol = tolerances.illumination;

      const unmatched = setObj.unmatched[kind];
      const extra = setObj.extra[kind];
      const boundary = setObj.boundary[kind];

      const pass = stats.maxAbs <= tol && unmatched === 0 && extra === 0;

      table[kind] = {
        n: stats.n,
        unmatched,
        extra,
        boundary,
        maxAbs: stats.maxAbs,
        mean: stats.mean,
        p95: stats.p95,
        tolerance: tol,
        pass,
      };
    }
    return table;
  }

  const decisionTable = compileSetStats(sets.decision);
  const extendedTable = compileSetStats(sets.extended);

  // Compute maximum sun error on decision set
  const sunMaxErrors = SUN_KINDS.map((k) => decisionTable[k]?.maxAbs ?? 0);
  const maxSunError = Math.max(...sunMaxErrors);

  const allPassed = Object.values(decisionTable).every((row) => row.pass);

  return {
    candidateId: candidate.id,
    decision: decisionTable,
    extended: extendedTable,
    maxSunError,
    allPassed,
    extendedByYear: sets.extended.byYear,
  };
}

/**
 * Decides winning engine based on decision set results and tolerances.
 * @param {Record<string, ReturnType<typeof scoreCandidate>>} candidateScores
 * @returns {{ chosen: string|null, passed: string[], reasons: string[] }}
 */
export function decideEngine(candidateScores) {
  const passed = [];
  const reasons = [];

  for (const [id, score] of Object.entries(candidateScores)) {
    if (score.allPassed) {
      passed.push(id);
    } else {
      reasons.push(`${id} failed accuracy tolerances or had unmatched/extra events`);
    }
  }

  if (passed.length === 0) {
    return { chosen: null, passed: [], reasons };
  }

  if (passed.length === 1) {
    const chosen = passed[0];
    reasons.push(
      `${chosen} is the only candidate meeting all accuracy tolerances (max sun error: ${candidateScores[chosen].maxSunError.toFixed(1)}s)`,
    );
    return { chosen, passed, reasons };
  }

  // Multiple candidates passed: pick lowest max sun error; prefer astronomy-engine on < 1s difference
  const sorted = passed.slice().sort((a, b) => {
    return candidateScores[a].maxSunError - candidateScores[b].maxSunError;
  });

  const best = sorted[0];
  const second = sorted[1];
  const diff = Math.abs(candidateScores[best].maxSunError - candidateScores[second].maxSunError);

  let chosen = best;
  if (diff < 1.0) {
    if (passed.includes('astronomy-engine')) {
      chosen = 'astronomy-engine';
      reasons.push(
        `Difference between top candidates is ${diff.toFixed(2)}s (< 1s); preferring astronomy-engine by architectural policy`,
      );
    }
  } else {
    reasons.push(
      `${chosen} selected with lowest maximum sun error (${candidateScores[chosen].maxSunError.toFixed(1)}s vs ${candidateScores[second].maxSunError.toFixed(1)}s)`,
    );
  }

  return { chosen, passed, reasons };
}

/**
 * Computes range advice from extended set results.
 * @param {Record<string, ReturnType<typeof scoreCandidate>>} candidateScores
 * @param {object} tolerances
 * @returns {Record<string, { maxYear: number, sentence: string }>}
 */
export function rangeAdvice(candidateScores, tolerances) {
  const advice = {};

  for (const [id, score] of Object.entries(candidateScores)) {
    const byYear = score.extendedByYear || {};
    let lastValidYear = 2028;

    const years = Object.keys(byYear)
      .map(Number)
      .sort((a, b) => a - b);
    for (const yr of years) {
      const errs = byYear[yr] || [];
      const maxErr = errs.length > 0 ? Math.max(...errs) : 0;
      if (maxErr <= tolerances.sunSeconds) {
        lastValidYear = yr;
      }
    }

    advice[id] = {
      maxYear: lastValidYear,
      sentence:
        lastValidYear >= 2100
          ? `${id} maintains full sun accuracy within ±1 minute through 2100.`
          : `Accuracy for dates after ${lastValidYear} is limited by ΔT (Earth rotation) uncertainty (Proposed).`,
    };
  }

  return advice;
}
