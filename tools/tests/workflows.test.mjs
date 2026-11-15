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

  it('codeql workflow grants security-events write and analyzes javascript-typescript', () => {
    const codeqlPath = path.join(repoRoot, '.github', 'workflows', 'codeql.yml');
    expect(fs.existsSync(codeqlPath)).toBe(true);
    const content = fs.readFileSync(codeqlPath, 'utf8');

    // Workflow permissions and job permissions
    expect(content).toContain('contents: read');
    expect(content).toContain('security-events: write');

    // Init step with build-mode: none
    expect(content).toContain('uses: github/codeql-action/init@v4');
    expect(content).toContain('languages: javascript-typescript');
    expect(content).toContain('build-mode: none');

    // Analyze step with category
    expect(content).toContain('uses: github/codeql-action/analyze@v4');
    expect(content).toContain("category: '/language:javascript-typescript'");
  });

  it('codeql workflow triggers on push pull_request and a weekly schedule', () => {
    const codeqlPath = path.join(repoRoot, '.github', 'workflows', 'codeql.yml');
    expect(fs.existsSync(codeqlPath)).toBe(true);
    const content = fs.readFileSync(codeqlPath, 'utf8');

    // Trigger specifications
    expect(content).toMatch(/push:\s+branches:\s+- main/);
    expect(content).toMatch(/pull_request:\s+branches:\s+- main/);
    expect(content).toMatch(/schedule:\s+- cron: '0 5 \* \* 1'/);
  });
});
