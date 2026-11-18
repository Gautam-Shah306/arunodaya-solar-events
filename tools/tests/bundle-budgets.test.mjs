import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  ASTRONOMY_DISTINCTIVE_STRING,
  BUNDLE_BUDGETS,
  calculateFirstLoadJs,
} from '../lib/bundle-budgets.mjs';
import { buildVitestThresholds, COVERAGE_GATES } from '../lib/coverage-gates.mjs';

describe('bundle-budgets and coverage-gates logic', () => {
  let tempRoot = '';

  beforeAll(() => {
    tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'arunodaya-budgets-test-'));

    const pagesDir = path.join(tempRoot, 'dist', 'pages');
    const pagesAssets = path.join(pagesDir, 'assets');
    fs.mkdirSync(pagesAssets, { recursive: true });
    fs.writeFileSync(
      path.join(pagesDir, 'index.html'),
      [
        '<!doctype html>',
        '<html><head>',
        '<script src="/arunodaya-solar-events/early-theme.js"></script>',
        '<script type="module" src="/arunodaya-solar-events/assets/main-abc.js"></script>',
        '<link rel="modulepreload" href="/arunodaya-solar-events/assets/vendor-react-123.js">',
        '<link rel="modulepreload" href="/arunodaya-solar-events/assets/missing-chunk.js">',
        '</head><body></body></html>',
      ].join('\n'),
      'utf8',
    );
    fs.writeFileSync(path.join(pagesDir, 'early-theme.js'), 'console.log("early");\n', 'utf8');
    fs.writeFileSync(
      path.join(pagesAssets, 'main-abc.js'),
      `export const main = "${'hello'.repeat(200)}";\n`,
      'utf8',
    );
    fs.writeFileSync(
      path.join(pagesAssets, 'vendor-react-123.js'),
      `export const vendor = "${'react'.repeat(400)}";\n`,
      'utf8',
    );

    const androidDir = path.join(tempRoot, 'dist', 'android');
    const androidAssets = path.join(androidDir, 'assets');
    fs.mkdirSync(androidAssets, { recursive: true });
    fs.writeFileSync(
      path.join(androidDir, 'index.html'),
      '<script src="./early-theme.js"></script><script type="module" src="./assets/main-and.js"></script>',
      'utf8',
    );
    fs.writeFileSync(path.join(androidDir, 'early-theme.js'), 'console.log("early");\n', 'utf8');
    fs.writeFileSync(
      path.join(androidAssets, 'main-and.js'),
      `export const main = "${'android'.repeat(200)}";\n`,
      'utf8',
    );
  });

  afterAll(() => {
    if (tempRoot) {
      fs.rmSync(tempRoot, { recursive: true, force: true });
    }
  });

  it('BUNDLE_BUDGETS defines positive byte limits for pages and android', () => {
    expect(BUNDLE_BUDGETS.pagesGzipBytes).toBeGreaterThan(0);
    expect(BUNDLE_BUDGETS.androidGzipBytes).toBeGreaterThan(0);
    expect(ASTRONOMY_DISTINCTIVE_STRING).toBe('Invalid observer coordinates');
  });

  it('calculateFirstLoadJs throws clearly when target dist directory is missing', () => {
    // @ts-expect-error test invalid target
    expect(() => calculateFirstLoadJs('non-existent-target', tempRoot)).toThrow(
      /index\.html not found/,
    );
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
    const pagesFirst = calculateFirstLoadJs('pages', tempRoot);
    expect(pagesFirst.files.length).toBe(3);
    expect(pagesFirst.totalGzipBytes).toBeGreaterThan(0);
    expect(pagesFirst.totalRawBytes).toBeGreaterThan(0);

    const androidFirst = calculateFirstLoadJs('android', tempRoot);
    expect(androidFirst.files.length).toBe(2);
    expect(androidFirst.totalGzipBytes).toBeGreaterThan(0);

    // Mock directory with non-js assets to test filtering
    const customDist = path.join(tempRoot, 'dist', 'custom');
    fs.mkdirSync(customDist, { recursive: true });
    fs.writeFileSync(
      path.join(customDist, 'index.html'),
      '<script type="module" src="/app.wasm"></script><link rel="modulepreload" href="/style.css">',
      'utf8',
    );
    // @ts-expect-error custom target fixture
    const mockRes = calculateFirstLoadJs('custom', tempRoot);
    expect(mockRes.files).toEqual([]);
    expect(mockRes.totalRawBytes).toBe(0);
  });

  it('first-load JavaScript includes statically imported shared chunks', () => {
    const pagesFirst = calculateFirstLoadJs('pages', tempRoot);
    expect(pagesFirst.files).toContain('early-theme.js');
    expect(pagesFirst.files).toContain('main-abc.js');
    expect(pagesFirst.files).toContain('vendor-react-123.js');
  });

  it('bundle budgets compare gzip bytes with gzip budgets', () => {
    const pagesFirst = calculateFirstLoadJs('pages', tempRoot);
    expect(pagesFirst.totalGzipBytes).toBeLessThan(pagesFirst.totalRawBytes);
    expect(pagesFirst.totalGzipBytes).toBeLessThanOrEqual(BUNDLE_BUDGETS.pagesGzipBytes);
  });
});
