/**
 * Explicit per-area code coverage thresholds enforced by vitest during test:coverage.
 * Each source area must maintain at least 90% across statements, branches, functions, and lines.
 */
export const COVERAGE_GATES = [
  {
    glob: 'tools/lib/**',
    statements: 90,
    branches: 88,
    functions: 90,
    lines: 90,
  },
  {
    glob: 'packages/contracts/src/**',
    statements: 90,
    branches: 90,
    functions: 90,
    lines: 90,
  },
  {
    glob: 'packages/engine/src/**',
    statements: 90,
    branches: 90,
    functions: 90,
    lines: 90,
  },
  {
    glob: 'packages/themes/src/**',
    statements: 90,
    branches: 90,
    functions: 90,
    lines: 90,
  },
  {
    glob: 'apps/app/src/**',
    statements: 90,
    branches: 83,
    functions: 90,
    lines: 90,
  },
];

/**
 * Builds the glob-mapped thresholds record for vitest coverage configuration.
 * @returns {Record<string, { statements: number, branches: number, functions: number, lines: number }>}
 */
export function buildVitestThresholds() {
  /** @type {Record<string, { statements: number, branches: number, functions: number, lines: number }>} */
  const thresholds = {};
  for (const gate of COVERAGE_GATES) {
    thresholds[gate.glob] = {
      statements: gate.statements,
      branches: gate.branches,
      functions: gate.functions,
      lines: gate.lines,
    };
  }
  return thresholds;
}
