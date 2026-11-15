import { describe, expect, it } from 'vitest';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { makeTree } from '../helpers.mjs';

const cliPath = path.resolve('tools/verify-invariants.mjs');

describe('verify-invariants CLI', () => {
  it('CLI exits 0 on a clean tree and prints the summary line', async () => {
    await makeTree(
      {
        'tools/invariants.config.json': JSON.stringify({
          requiredDocs: ['README.md'],
        }),
        'README.md': '# Clean Project\n',
        'apps/app/src/clean.ts': 'export const a = 1;\n',
      },
      (root) => {
        const res = spawnSync(process.execPath, [cliPath, '--root', root], {
          encoding: 'utf8',
        });
        expect(res.status).toBe(0);
        expect(res.stdout).toContain('invariants: 0 findings across 0 files (0 rules)');
      },
    );
  });

  it('CLI exits 1 on findings and lists rule path and line', async () => {
    await makeTree(
      {
        'tools/invariants.config.json': JSON.stringify({
          requiredDocs: [],
        }),
        'apps/app/src/bad.ts': 'const d = new Date(1234).getHours();\n',
      },
      (root) => {
        const res = spawnSync(process.execPath, [cliPath, '--root', root], {
          encoding: 'utf8',
        });
        expect(res.status).toBe(1);
        expect(res.stderr).toContain('[INV-TIME] apps/app/src/bad.ts:1');
        expect(res.stdout).toContain('invariants: 1 findings across 1 files (1 rules)');
      },
    );
  });

  it('CLI exits 2 on invalid config', async () => {
    await makeTree(
      {
        'tools/invariants.config.json': JSON.stringify({
          allow: [
            {
              rule: 'INV-TIME',
              path: 'foo',
              reason: 'short',
            },
          ],
        }),
      },
      (root) => {
        const res = spawnSync(process.execPath, [cliPath, '--root', root], {
          encoding: 'utf8',
        });
        expect(res.status).toBe(2);
      },
    );
  });

  it('CLI json output is machine readable', async () => {
    await makeTree(
      {
        'tools/invariants.config.json': JSON.stringify({
          requiredDocs: [],
        }),
        'apps/app/src/clean.ts': 'export const clean = true;\n',
      },
      (root) => {
        const res = spawnSync(process.execPath, [cliPath, '--root', root, '--json'], {
          encoding: 'utf8',
        });
        expect(res.status).toBe(0);
        const parsed = JSON.parse(res.stdout);
        expect(parsed).toHaveProperty('findings');
        expect(parsed).toHaveProperty('summary');
        expect(parsed.summary.findingsCount).toBe(0);
      },
    );
  });
});
