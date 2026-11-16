import { describe, expect, it } from 'vitest';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { toRelPath, walkRepoFiles } from '../../lib/invariants/walk.mjs';
import { isAllowed } from '../../lib/invariants/config.mjs';
import { runInvariants } from '../../lib/invariants/index.mjs';
import { makeTree } from '../helpers.mjs';

const cliPath = path.resolve('tools/verify-invariants.mjs');
const repoRoot = path.resolve('.');

describe('Invariants scanner and real repository verification', () => {
  it('walk returns forward-slash relative paths on every platform', async () => {
    // Test toRelPath explicitly with Windows and POSIX styled paths
    const winRoot = 'C:\\repo\\project';
    const winFull = 'C:\\repo\\project\\apps\\app\\src\\main.ts';
    expect(toRelPath(winRoot, winFull)).toBe('apps/app/src/main.ts');

    const winFullMixed = 'c:\\repo\\project\\packages\\engine\\src\\index.ts';
    expect(toRelPath(winRoot, winFullMixed)).toBe('packages/engine/src/index.ts');

    const outsidePath = 'C:\\repo\\other\\file.ts';
    expect(toRelPath(winRoot, outsidePath)).toBe('../other/file.ts');

    await makeTree(
      {
        'apps/app/src/index.ts': 'export const a = 1;\n',
        'packages/engine/src/calc.ts': 'export const b = 2;\n',
        'tools/verify.mjs': 'console.log(1);\n',
      },
      (tmpRoot) => {
        const files = walkRepoFiles(tmpRoot);
        expect(files.length).toBe(3);
        for (const file of files) {
          expect(file).not.toContain('\\');
          expect(file.includes('/')).toBe(true);
        }
      },
    );
  });

  it('toRelPath resolves windows drive paths portably on non-windows platforms', () => {
    const winRoot = 'D:\\Sem4 vac\\arunodaya-solar-events';
    const winInside = 'D:\\Sem4 vac\\arunodaya-solar-events\\apps\\app\\src\\main.ts';
    expect(toRelPath(winRoot, winInside)).toBe('apps/app/src/main.ts');

    const winSibling = 'D:\\Sem4 vac\\other-repo\\file.ts';
    expect(toRelPath(winRoot, winSibling)).toBe('../other-repo/file.ts');

    const winMixedDrive = 'd:\\Sem4 vac\\arunodaya-solar-events\\tools\\verify.mjs';
    expect(toRelPath(winRoot, winMixedDrive)).toBe('tools/verify.mjs');
  });

  it('allowlist matching uses forward-slash relative paths', () => {
    const config = {
      allow: [
        {
          rule: 'INV-TIME',
          path: 'packages/engine/src/time/ist.ts',
          reason: 'Designated IST calculation module',
        },
        {
          rule: 'INV-NET',
          path: 'packages/net-adapter/',
          reason: 'Allow network calls in designated adapter',
        },
      ],
    };

    // Forward-slash relative path
    expect(isAllowed(config, 'INV-TIME', 'packages/engine/src/time/ist.ts')).toBe(true);

    // Backslash relative path normalizes to forward slash
    expect(isAllowed(config, 'INV-TIME', 'packages\\engine\\src\\time\\ist.ts')).toBe(true);

    // Prefix match with trailing slash
    expect(isAllowed(config, 'INV-NET', 'packages/net-adapter/client.ts')).toBe(true);
    expect(isAllowed(config, 'INV-NET', 'packages\\net-adapter\\client.ts')).toBe(true);

    // Disallowed path
    expect(isAllowed(config, 'INV-TIME', 'packages/engine/src/other.ts')).toBe(false);
  });

  it('runInvariants counts scanned files and rules run', async () => {
    await makeTree(
      {
        'tools/invariants.config.json': JSON.stringify({
          requiredDocs: ['README.md'],
        }),
        'README.md': '# Project\n',
        'package.json': JSON.stringify({ name: 'test-root', version: '1.0.0' }),
        'package-lock.json': JSON.stringify({
          name: 'test-root',
          lockfileVersion: 3,
          packages: {},
        }),
        'apps/app/src/clean.ts': 'export const x = 1;\n',
      },
      (root) => {
        const { findings, summary } = runInvariants({ root });
        expect(findings).toHaveLength(0);
        expect(summary.rulesRun).toBe(11);
        expect(summary.filesScanned).toBeGreaterThan(0);
        expect(summary.ruleStats).toBeDefined();
        expect(Object.keys(summary.ruleStats)).toHaveLength(11);

        // Also test fallback defaults when config has no requiredDocs
        const fallback = runInvariants({ root, config: {} });
        expect(fallback.summary.rulesRun).toBe(11);
      },
    );
  });

  it('CLI summary reports files scanned and rules run', async () => {
    await makeTree(
      {
        'tools/invariants.config.json': JSON.stringify({
          requiredDocs: ['README.md'],
        }),
        'README.md': '# Project\n',
        'apps/app/src/clean.ts': 'export const x = 1;\n',
      },
      (root) => {
        const res = spawnSync(process.execPath, [cliPath, '--root', root], {
          encoding: 'utf8',
        });
        expect(res.status).toBe(0);
        expect(res.stdout).toMatch(
          /invariants: 0 findings across \d+ files scanned \(11 rules run\)/,
        );
      },
    );
  });

  it('verbose output lists every rule with its file count', async () => {
    await makeTree(
      {
        'tools/invariants.config.json': JSON.stringify({
          requiredDocs: ['README.md'],
        }),
        'README.md': '# Project\n',
        'apps/app/src/clean.ts': 'export const x = 1;\n',
      },
      (root) => {
        const res = spawnSync(process.execPath, [cliPath, '--root', root, '--verbose'], {
          encoding: 'utf8',
        });
        expect(res.status).toBe(0);
        expect(res.stdout).toContain('Invariants rule execution breakdown:');
        const expectedRules = [
          'INV-TIME',
          'INV-CLOCK',
          'INV-COLOR',
          'INV-NET',
          'INV-LAYERS',
          'INV-SECRETS',
          'INV-DEPS',
          'INV-LICENSE',
          'INV-LF',
          'INV-DOCS',
          'INV-BOM',
        ];
        for (const rule of expectedRules) {
          expect(res.stdout).toMatch(new RegExp(`${rule}: \\d+ file\\(s\\) scanned`));
        }
        expect(res.stdout).toMatch(
          /invariants: 0 findings across \d+ files scanned \(11 rules run\)/,
        );
      },
    );
  });

  it('checker detects a seeded violation in a copy of the real repository layout', async () => {
    await makeTree(
      {
        'tools/invariants.config.json': JSON.stringify({
          requiredDocs: ['README.md'],
          licenseAllowlist: ['MIT'],
        }),
        'README.md': '# Mini Repo\n',
        'package.json': JSON.stringify({
          name: 'mini-repo',
          version: '1.0.0',
          private: true,
        }),
        'apps/app/src/main.ts': 'export const app = 1;\n',
        // Seeded architectural layer violation: packages/engine accessing banned DOM globals
        'packages/engine/src/index.ts': 'export const val = window.localStorage.getItem("key");\n',
        'packages/contracts/src/index.ts': 'export type ID = string;\n',
        'packages/themes/src/index.ts': 'export const theme = "dark";\n',
      },
      (root) => {
        const { findings, summary } = runInvariants({ root });
        expect(findings.length).toBeGreaterThan(0);
        const layerFinding = findings.find((f) => f.rule === 'INV-LAYERS');
        expect(layerFinding).toBeDefined();
        expect(layerFinding?.path).toBe('packages/engine/src/index.ts');
        expect(layerFinding?.message).toContain('window');
        expect(summary.rulesRun).toBe(11);
      },
    );
  });

  it('real repository scan covers apps packages tools and docs and runs all eleven rules', () => {
    const allFiles = walkRepoFiles(repoRoot);
    const hasApps = allFiles.some((f) => f.startsWith('apps/'));
    const hasPackages = allFiles.some((f) => f.startsWith('packages/'));
    const hasTools = allFiles.some((f) => f.startsWith('tools/'));
    const hasDocs = allFiles.some((f) => f.startsWith('docs/'));

    expect(hasApps).toBe(true);
    expect(hasPackages).toBe(true);
    expect(hasTools).toBe(true);
    expect(hasDocs).toBe(true);

    const { findings, summary } = runInvariants({ root: repoRoot });

    expect(summary.filesScanned).toBeGreaterThan(50);
    expect(summary.rulesRun).toBe(11);
    expect(findings).toHaveLength(0);
  });
});
