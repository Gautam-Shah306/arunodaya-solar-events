import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  checkScenarios,
  collectTestTitles,
  extractTitlesFromFile,
  loadScenarioFiles,
} from '../lib/scenarios.mjs';
import { VERIFY_STEPS } from '../verify.mjs';

describe('Scenario title checker', () => {
  it('scenario checker collects titles from it and test calls', () => {
    const code = `
      describe('sample', () => {
        it('first sample title', () => {});
        test('second sample title', () => {});
        it.skip('third skipped title', () => {});
        test.only(\`template title\`, () => {});
      });
    `;
    const titles = extractTitlesFromFile('sample.test.ts', code);
    expect(titles).toContain('first sample title');
    expect(titles).toContain('second sample title');
    expect(titles).toContain('third skipped title');
    expect(titles).toContain('template title');
  });

  it('scenario checker reports titles missing from the test suite', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'arunodaya-scenarios-missing-'));
    try {
      const scenariosDir = path.join(tempDir, 'scenarios');
      fs.mkdirSync(scenariosDir, { recursive: true });
      fs.writeFileSync(
        path.join(scenariosDir, 'sample.txt'),
        'existing title\nscenario that does not exist anywhere\n',
      );
      fs.writeFileSync(
        path.join(tempDir, 'sample.test.mjs'),
        "import { it } from 'vitest'; it('existing title', () => {});\n",
      );

      const result = checkScenarios({ root: tempDir, scenariosDir });
      expect(result.passed).toBe(false);
      expect(result.missing.length).toBe(1);
      expect(result.missing[0]?.title).toBe('scenario that does not exist anywhere');
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('scenario checker ignores blank lines and comment lines', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'arunodaya-scenarios-comments-'));
    try {
      fs.writeFileSync(
        path.join(tempDir, 'comments.txt'),
        '# This is a comment\n\n   \n# Another comment\nreal title line\n\n',
      );

      const loaded = loadScenarioFiles(tempDir);
      expect(loaded.length).toBe(1);
      expect(loaded[0]?.title).toBe('real title line');
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('scenario checker finds titles in e2e test files', () => {
    const titles = collectTestTitles(path.resolve('tools/tests-e2e'));
    // Checks that e2e test titles are collected from tools/tests-e2e
    expect(titles.size).toBeGreaterThan(10);
    const hasE2e = Array.from(titles).some(
      (t) => t.includes('Playfair Display') || t.startsWith('e2e:'),
    );
    expect(hasE2e).toBe(true);
  });

  it('verify runs the scenario check right after the invariants check', () => {
    const invIdx = VERIFY_STEPS.indexOf('verify:invariants');
    const scnIdx = VERIFY_STEPS.indexOf('verify:scenarios');
    expect(invIdx).toBeGreaterThanOrEqual(0);
    expect(scnIdx).toBe(invIdx + 1);
    expect(VERIFY_STEPS.length).toBe(12);
  });
});
