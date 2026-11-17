import { beforeAll, describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { buildApp } from '../build-app.mjs';
import {
  ASTRONOMY_DISTINCTIVE_STRING,
  BUNDLE_BUDGETS,
  calculateFirstLoadJs,
} from '../lib/bundle-budgets.mjs';
import { buildVitestThresholds, COVERAGE_GATES } from '../lib/coverage-gates.mjs';

describe('bundle-budgets and coverage-gates logic', () => {
  beforeAll(async () => {
    if (!fs.existsSync(path.resolve('apps/app/dist/pages/index.html'))) {
      await buildApp('pages');
    }
    if (!fs.existsSync(path.resolve('apps/app/dist/android/index.html'))) {
      await buildApp('android');
    }
  });
  it('BUNDLE_BUDGETS defines positive byte limits for pages and android', () => {
    expect(BUNDLE_BUDGETS.pagesGzipBytes).toBeGreaterThan(0);
    expect(BUNDLE_BUDGETS.androidGzipBytes).toBeGreaterThan(0);
    expect(ASTRONOMY_DISTINCTIVE_STRING).toBe('Invalid observer coordinates');
  });

  it('calculateFirstLoadJs throws clearly when target dist directory is missing', () => {
    // @ts-expect-error test invalid target
    expect(() => calculateFirstLoadJs('non-existent-target')).toThrow(/index\.html not found/);
  });

  it('coverage gates are defined for every source area', () => {
    const areas = COVERAGE_GATES.map((g) => g.glob);
    expect(areas).toContain('tools/lib/**');
    expect(areas).toContain('packages/contracts/src/**');
    expect(areas).toContain('packages/engine/src/**');
    expect(areas).toContain('packages/themes/src/**');
    expect(areas).toContain('apps/app/src/**');
    expect(COVERAGE_GATES.length).toBe(5);

    const thresholds = buildVitestThresholds();
    for (const gate of COVERAGE_GATES) {
      expect(thresholds[gate.glob]).toEqual({
        statements: gate.statements,
        branches: gate.branches,
        functions: gate.functions,
        lines: gate.lines,
      });
    }
  });

  it('calculateFirstLoadJs calculates entry scripts and preloads for pages and android', () => {
    const pagesFirst = calculateFirstLoadJs('pages');
    expect(pagesFirst.files.length).toBeGreaterThan(0);
    expect(pagesFirst.totalGzipBytes).toBeGreaterThan(0);
    expect(pagesFirst.totalRawBytes).toBeGreaterThan(0);

    const androidFirst = calculateFirstLoadJs('android');
    expect(androidFirst.files.length).toBeGreaterThan(0);
    expect(androidFirst.totalGzipBytes).toBeGreaterThan(0);

    // Mock directory with non-js and missing files to test filtering
    const tempDir = path.resolve('.scratch/test-first-load');
    const tempDist = path.join(tempDir, 'dist', 'custom');
    fs.mkdirSync(tempDist, { recursive: true });
    fs.writeFileSync(
      path.join(tempDist, 'index.html'),
      '<script type="module" src="/app.wasm"></script><link rel="modulepreload" href="/style.css">',
    );
    const mockRes = calculateFirstLoadJs('custom', tempDir);
    expect(mockRes.files).toEqual([]);
    expect(mockRes.totalRawBytes).toBe(0);
  });
});
