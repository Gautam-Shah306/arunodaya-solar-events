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

  it('nightly workflow runs the golden tests on a schedule', () => {
    const nightlyPath = path.join(repoRoot, '.github', 'workflows', 'nightly.yml');
    expect(fs.existsSync(nightlyPath)).toBe(true);
    const content = fs.readFileSync(nightlyPath, 'utf8');

    expect(content).toContain("cron: '17 2 * * *'");
    expect(content).toContain('workflow_dispatch:');
    expect(content).toContain('npm run test:golden');
    expect(content).toContain('npm run verify:invariants');
    expect(content).toContain("NO_COLOR: '1'");
    expect(content).toContain("FORCE_COLOR: '0'");
    expect(content).toMatch(/permissions:\s+contents:\s+read/);
  });

  it('nightly workflow audits production dependencies', () => {
    const nightlyPath = path.join(repoRoot, '.github', 'workflows', 'nightly.yml');
    expect(fs.existsSync(nightlyPath)).toBe(true);
    const content = fs.readFileSync(nightlyPath, 'utf8');

    expect(content).toContain('npm audit --omit=dev --audit-level=high');
  });

  it('dependabot groups astronomy-engine separately', () => {
    const dependabotPath = path.join(repoRoot, '.github', 'dependabot.yml');
    expect(fs.existsSync(dependabotPath)).toBe(true);
    const content = fs.readFileSync(dependabotPath, 'utf8');

    expect(content).toContain('astronomy:');
    expect(content).toContain("- 'astronomy-engine'");
    expect(content).toContain('test:golden');
  });
});
