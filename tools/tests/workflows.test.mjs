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
    const e2ePath = path.join(repoRoot, '.github', 'workflows', 'e2e.yml');

    const ciContent = fs.readFileSync(ciPath, 'utf8');
    const pagesContent = fs.readFileSync(pagesPath, 'utf8');
    const e2eContent = fs.readFileSync(e2ePath, 'utf8');

    for (const content of [ciContent, pagesContent, e2eContent]) {
      expect(content).toMatch(/env:\s+NO_COLOR:\s*'1'\s+FORCE_COLOR:\s*'0'/);
    }
  });

  it('e2e workflow installs chromium and runs test:e2e', () => {
    const e2ePath = path.join(repoRoot, '.github', 'workflows', 'e2e.yml');
    expect(fs.existsSync(e2ePath)).toBe(true);
    const content = fs.readFileSync(e2ePath, 'utf8');
    expect(content).toContain('npm run e2e:install');
    expect(content).toContain('npm run test:e2e');
    expect(content).toContain('upload-artifact');
    expect(content).toContain('.scratch/e2e');
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

  it('lint-workflows builds docker arguments from the recorded digest without double quotes', async () => {
    const { buildActionlintArgs } = await import('../lib/lint-workflows.mjs');
    const fakeToolchain = `# Toolchain\nrhysd/actionlint@sha256:0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef\n`;
    const args = buildActionlintArgs({
      repoPath: '/work/my-repo',
      toolchainContent: fakeToolchain,
    });

    expect(args).toEqual([
      'run',
      '--rm',
      '-v',
      '/work/my-repo:/work',
      '-w',
      '/work',
      'rhysd/actionlint@sha256:0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
    ]);
    for (const arg of args) {
      expect(arg).not.toContain('"');
    }
  });

  it('lint-workflows keeps a path with spaces as a single argument', async () => {
    const { buildActionlintArgs } = await import('../lib/lint-workflows.mjs');
    const fakeToolchain = `Image: rhysd/actionlint@sha256:0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef`;
    const pathWithSpaces = 'D:\\Sem4 vac\\arunodaya-solar-events';
    const args = buildActionlintArgs({
      repoPath: pathWithSpaces,
      toolchainContent: fakeToolchain,
    });

    const mountArg = args[3];
    expect(mountArg).toBe(`${pathWithSpaces}:/work`);
    expect(mountArg).toContain('Sem4 vac');
  });

  it('lint-workflows fails clearly when no actionlint digest is recorded', async () => {
    const { buildActionlintArgs } = await import('../lib/lint-workflows.mjs');
    expect(() =>
      buildActionlintArgs({
        repoPath: '/tmp/repo',
        toolchainContent: '# No digest here\n',
      }),
    ).toThrow(/No actionlint image digest/i);
  });

  it('lint-workflows reads docs/TOOLCHAIN.md by default and handles missing path', async () => {
    const { buildActionlintArgs, extractActionlintDigest } =
      await import('../lib/lint-workflows.mjs');
    const defaultArgs = buildActionlintArgs();
    expect(defaultArgs).toContain('run');
    expect(defaultArgs.at(-1)).toMatch(/^rhysd\/actionlint@sha256:[a-f0-9]{64}$/);

    expect(() => buildActionlintArgs({ toolchainPath: '/nonexistent/TOOLCHAIN.md' })).toThrow(
      /Toolchain documentation not found/,
    );

    // Fallback regex matching
    const fallbackContent =
      'actionlint:\n  sha256:0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
    expect(extractActionlintDigest(fallbackContent)).toBe(
      'sha256:0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
    );
  });
});
