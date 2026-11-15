import { describe, expect, it } from 'vitest';
import path from 'node:path';
import { runInvariants } from '../../lib/invariants/index.mjs';
import { loadConfig, validateConfig } from '../../lib/invariants/config.mjs';
import { walkCodeFiles, walkRepoFiles } from '../../lib/invariants/walk.mjs';
import { makeTree } from '../helpers.mjs';

describe('Allowlist validation', () => {
  it('allowlist entry without a reason is rejected', async () => {
    expect(() => validateConfig(null)).toThrow(/valid JSON object/);
    expect(() => validateConfig('string')).toThrow(/valid JSON object/);

    await makeTree(
      {
        'config.json': JSON.stringify({ allow: [] }),
        'apps/app/src/index.ts': 'export const x = 1;',
        'apps/app/tests/test.ts': 'export const t = 1;',
        'apps/app/src/index.spec.ts': 'export const s = 1;',
        'node_modules/pkg/index.js': 'module.exports = 1;',
        'docs/notes.txt': 'notes',
      },
      (root) => {
        const loaded = loadConfig(path.join(root, 'config.json'));
        expect(loaded).toBeDefined();

        const repoFiles = walkRepoFiles(root);
        expect(repoFiles).toContain('apps/app/src/index.ts');
        expect(repoFiles).not.toContain('node_modules/pkg/index.js');

        const codeFiles = walkCodeFiles(root);
        expect(codeFiles).toContain('apps/app/src/index.ts');
        expect(codeFiles).not.toContain('apps/app/tests/test.ts');
        expect(codeFiles).not.toContain('apps/app/src/index.spec.ts');
        expect(codeFiles).not.toContain('docs/notes.txt');

        expect(() =>
          runInvariants({
            root,
            config: {
              requiredDocs: [],
              allow: [
                {
                  rule: 'INV-TIME',
                  path: 'apps/app/src/index.ts',
                  reason: 'short',
                },
              ],
            },
          }),
        ).toThrow(/reason of at least 10 characters/);

        expect(() =>
          runInvariants({
            root,
            config: {
              requiredDocs: [],
              allow: 'not-an-array',
            },
          }),
        ).toThrow(/must be an array/);

        expect(() =>
          runInvariants({
            root,
            config: {
              requiredDocs: [],
              allow: [null],
            },
          }),
        ).toThrow(/must be an object/);

        expect(() =>
          runInvariants({
            root,
            config: {
              requiredDocs: [],
              allow: [{ path: 'foo', reason: 'reason12345' }],
            },
          }),
        ).toThrow(/missing rule string/);

        expect(() =>
          runInvariants({
            root,
            config: {
              requiredDocs: [],
              allow: [{ rule: 'INV-TIME', reason: 'reason12345' }],
            },
          }),
        ).toThrow(/missing path string/);
      },
    );
  });

  it('allowlist entry suppresses exactly one rule for exactly one path', async () => {
    await makeTree(
      {
        'apps/app/src/file1.ts': 'fetch("url"); const d = new Date(1234).getHours();',
        'apps/app/src/file2.ts': 'fetch("url");',
        'apps/app/src/sub/file3.ts': 'fetch("url");',
      },
      (root) => {
        const { findings } = runInvariants({
          root,
          config: {
            requiredDocs: [],
            allow: [
              {
                rule: 'INV-NET',
                path: 'apps/app/src/file1.ts',
                reason: 'Suppress only INV-NET for file1.ts',
              },
              {
                rule: 'INV-NET',
                path: 'apps/app/src/sub/',
                reason: 'Suppress INV-NET for directory prefix sub/',
              },
            ],
          },
        });

        // INV-NET is suppressed for file1.ts
        expect(
          findings.some((f) => f.rule === 'INV-NET' && f.path === 'apps/app/src/file1.ts'),
        ).toBe(false);
        // INV-TIME is NOT suppressed for file1.ts
        expect(
          findings.some((f) => f.rule === 'INV-TIME' && f.path === 'apps/app/src/file1.ts'),
        ).toBe(true);
        // INV-NET is NOT suppressed for file2.ts
        expect(
          findings.some((f) => f.rule === 'INV-NET' && f.path === 'apps/app/src/file2.ts'),
        ).toBe(true);
        // INV-NET is suppressed for file3.ts under sub/
        expect(
          findings.some((f) => f.rule === 'INV-NET' && f.path === 'apps/app/src/sub/file3.ts'),
        ).toBe(false);
      },
    );
  });
});
