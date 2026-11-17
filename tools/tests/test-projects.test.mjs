import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { TEST_PROJECTS } from '../lib/test-projects.mjs';

function globToRegExp(glob) {
  const pattern = glob
    .replace(/\./g, '\\.')
    .replace(/\{([^}]+)\}/g, (_, choices) => `(${choices.split(',').join('|')})`)
    .replace(/\*\*\//g, '(?:.+/)?')
    .replace(/\*/g, '[^/]*');
  return new RegExp(`^${pattern}$`);
}

function findTestFiles(dir, files = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const relPath = path.relative('.', fullPath).replace(/\\/g, '/');
    if (entry.isDirectory()) {
      if (
        entry.name === 'node_modules' ||
        entry.name === '.git' ||
        entry.name === 'dist' ||
        entry.name === '.scratch' ||
        entry.name === 'coverage'
      ) {
        continue;
      }
      findTestFiles(fullPath, files);
    } else if (entry.isFile() && entry.name.includes('.test.')) {
      files.push(relPath);
    }
  }
  return files;
}

describe('Test Projects Coverage', () => {
  it('every test file is covered by a vitest project', () => {
    const testFiles = findTestFiles('.');
    expect(testFiles.length).toBeGreaterThan(0);

    const projectPatterns = TEST_PROJECTS.map((proj) => ({
      name: proj.name,
      regexes: proj.include.map((pat) => globToRegExp(pat)),
    }));

    for (const file of testFiles) {
      const matchingProjects = projectPatterns.filter((proj) =>
        proj.regexes.some((re) => re.test(file)),
      );

      expect(
        matchingProjects.length,
        `Expected file ${file} to match exactly one vitest project, but matched: ${matchingProjects.map((p) => p.name).join(', ')}`,
      ).toBe(1);
    }
  });

  it('coverage gates are defined for every source area', async () => {
    const { COVERAGE_GATES } = await import('../lib/coverage-gates.mjs');
    const requiredAreas = [
      'tools/lib/**',
      'packages/contracts/src/**',
      'packages/engine/src/**',
      'packages/themes/src/**',
      'apps/app/src/**',
    ];

    const definedGlobs = COVERAGE_GATES.map((g) => g.glob);
    for (const area of requiredAreas) {
      expect(definedGlobs).toContain(area);
      const gate = COVERAGE_GATES.find((g) => g.glob === area);
      expect(gate).toBeDefined();
      expect(gate?.statements).toBeGreaterThanOrEqual(80);
      expect(gate?.branches).toBeGreaterThanOrEqual(80);
      expect(gate?.functions).toBeGreaterThanOrEqual(80);
      expect(gate?.lines).toBeGreaterThanOrEqual(80);
    }

    const vitestConfigContent = fs.readFileSync(path.resolve('vitest.config.mjs'), 'utf8');
    expect(vitestConfigContent).toContain('coverage-gates.mjs');
    expect(vitestConfigContent).toMatch(/buildVitestThresholds|COVERAGE_GATES/);
  });
});
