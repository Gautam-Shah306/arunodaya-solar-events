import fs from 'node:fs';
import path from 'node:path';

const tolerancesPath = path.resolve('packages/engine/tests/data/astro-tolerances-v1.json');
const raw = JSON.parse(fs.readFileSync(tolerancesPath, 'utf8'));

/**
 * Astronomical benchmark tolerances implementing Arunodaya specification section 3.2:
 * Sun events within ±1 minute (60s), Solar Noon within ±30s,
 * Moon events within ±2 minutes (120s), and cross-check tolerances (Proposed).
 */
export const TOLERANCES = raw.tolerances;

/**
 * Regression guards enforcing tighter tolerances against algorithmic drift based on empirical benchmarks.
 */
export const REGRESSION_GUARD = raw.regressionGuard;
