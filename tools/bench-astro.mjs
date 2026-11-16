import fs from 'node:fs';
import path from 'node:path';
import { performance } from 'node:perf_hooks';
import { decideEngine, rangeAdvice, scoreCandidate } from './lib/astro-benchmark.mjs';
import { TOLERANCES } from './lib/astro-tolerances.mjs';
import * as astronomyEngineAdapter from './lib/candidates/astronomy-engine.mjs';
import * as suncalcAdapter from './lib/candidates/suncalc.mjs';

const datasetPath = path.resolve('packages/engine/tests/data/astro-reference-v1.json');
if (!fs.existsSync(datasetPath)) {
  console.error(`Dataset not found at ${datasetPath}. Run npm run reference:generate first.`);
  process.exit(1);
}

const dataset = JSON.parse(fs.readFileSync(datasetPath, 'utf8'));
const candidates = [astronomyEngineAdapter, suncalcAdapter];

// 1. Score candidates
/** @type {Record<string, any>} */
const scores = {};
for (const cand of candidates) {
  scores[cand.id] = scoreCandidate(dataset, cand, TOLERANCES);
}

// 2. Measure timing: median of three runs of computing 92 consecutive days for Rajkot
const rajkot = dataset.cities.find((/** @type {any} */ c) => c.id === 'rajkot');
const testDates = [];
const startDay = new Date(Date.UTC(2026, 3, 1)); // 2026-04-01
for (let i = 0; i < 92; i++) {
  const d = new Date(startDay.getTime() + i * 86_400_000);
  testDates.push(d.toISOString().slice(0, 10));
}

/** @type {Record<string, number>} */
const timings = {};
for (const cand of candidates) {
  const runs = [];
  for (let r = 0; r < 3; r++) {
    const t0 = performance.now();
    for (const d of testDates) {
      cand.computeDay(rajkot, d);
    }
    const t1 = performance.now();
    runs.push(t1 - t0);
  }
  runs.sort((a, b) => a - b);
  timings[cand.id] = runs[1] ?? 0; // median
}

// 3. Decision & Range advice
const decision = decideEngine(scores);
const advice = rangeAdvice(scores, TOLERANCES);

// Check if --json
const isJson = process.argv.includes('--json');
if (isJson) {
  console.log(JSON.stringify({ scores, timings, decision, advice }, null, 2));
  process.exit(0);
}

// Format Markdown output
/**
 * @param {string} tableName
 * @param {Record<string, any>} tableData
 * @param {boolean} [isExtended=false]
 */
function formatTable(tableName, tableData, isExtended = false) {
  const lines = [];
  lines.push(`### ${tableName}\n`);
  lines.push(
    '| Event Kind | n | Unmatched | Extra | Boundary | Max Error (s) | Mean Error (s) | P95 Error (s) | Tolerance (s) | Status |',
  );
  lines.push('| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |');
  for (const [kind, row] of Object.entries(tableData)) {
    const status = isExtended ? 'info' : row.pass ? 'PASS' : 'FAIL';
    lines.push(
      `| ${kind} | ${row.n} | ${row.unmatched} | ${row.extra} | ${row.boundary} | ${row.maxAbs.toFixed(2)} | ${row.mean.toFixed(2)} | ${row.p95.toFixed(2)} | ${row.tolerance} | ${status} |`,
    );
  }
  return lines.join('\n');
}

for (const cand of candidates) {
  console.log(`\n## Candidate: ${cand.id} (v${cand.version})\n`);
  console.log(formatTable(`Decision Set (2790 city-days)`, scores[cand.id].decision, false));
  console.log('\n');
  console.log(
    formatTable(`Extended-Range Set (24 city-days, report-only)`, scores[cand.id].extended, true),
  );
  console.log(
    '*Note: Extended-range dates after 2030 are subject to ΔT (Earth rotation) uncertainty and are report-only.*\n',
  );
}

console.log('## Benchmark Timings (Rajkot 92 consecutive days, median of 3 runs)');
for (const [id, ms] of Object.entries(timings)) {
  console.log(`- ${id}: ${ms.toFixed(1)} ms (~${(ms / 92).toFixed(2)} ms/day)`);
}

console.log('\n## Supported Range Advice');
for (const [id, adv] of Object.entries(advice)) {
  console.log(`- ${id}: ${adv.sentence}`);
}

const chosenStr = decision.chosen ? decision.chosen : 'none';
const reasonStr = decision.reasons.join('; ');
console.log(`\nDECISION: ${chosenStr} - ${reasonStr}`);
