import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const repoRoot = path.resolve('.');

describe('Workflow and Automation Configurations', () => {
  it('dependabot config ignores typescript major updates', () => {
    const dependabotPath = path.join(repoRoot, '.github', 'dependabot.yml');
    expect(fs.existsSync(dependabotPath)).toBe(true);
    const content = fs.readFileSync(dependabotPath, 'utf8');

    // Asserts npm ecosystem ignores semver-major updates for typescript
    expect(content).toContain("package-ecosystem: 'npm'");
    expect(content).toContain("dependency-name: 'typescript'");
    expect(content).toContain("'version-update:semver-major'");
    expect(content).toContain('open-pull-requests-limit: 5');
  });

  it('no custom codeql workflow exists because default setup is used', () => {
    const codeqlPath = path.join(repoRoot, '.github', 'workflows', 'codeql.yml');
    expect(fs.existsSync(codeqlPath)).toBe(false);
  });

  it('ci and pages workflows disable colour output', () => {
    const ciPath = path.join(repoRoot, '.github', 'workflows', 'ci.yml');
    const pagesPath = path.join(repoRoot, '.github', 'workflows', 'pages.yml');

    const ciContent = fs.readFileSync(ciPath, 'utf8');
    const pagesContent = fs.readFileSync(pagesPath, 'utf8');

    for (const content of [ciContent, pagesContent]) {
      expect(content).toMatch(/env:\s+NO_COLOR:\s*'1'\s+FORCE_COLOR:\s*'0'/);
    }
  });
});
