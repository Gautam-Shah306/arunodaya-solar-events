import { describe, expect, it } from 'vitest';
import { runInvariants } from '../../lib/invariants/index.mjs';
import { checkInvClock } from '../../lib/invariants/rule-clock.mjs';
import { makeTree } from '../helpers.mjs';

const config = { requiredDocs: [] };

describe('INV-CLOCK', () => {
  it('INV-CLOCK flags Date.now in the engine', async () => {
    await makeTree(
      {
        'packages/engine/src/solar.ts':
          'export const now = Date.now(); export const p = performance.now();',
        'packages/engine/src/style.css': 'body { margin: 0; }',
      },
      (root) => {
        const { findings } = runInvariants({ root, config });
        const clockFindings = findings.filter((f) => f.rule === 'INV-CLOCK');
        expect(clockFindings.length).toBeGreaterThanOrEqual(2);
        expect(clockFindings[0]?.message).toContain('Date.now()');

        const cssRes = checkInvClock(root, 'packages/engine/src/style.css');
        expect(cssRes).toHaveLength(0);
      },
    );
  });

  it('INV-CLOCK flags zero-argument new Date in the engine', async () => {
    await makeTree(
      {
        'packages/engine/src/lunar.ts': 'export const current = new Date();',
      },
      (root) => {
        const { findings } = runInvariants({ root, config });
        const clockFindings = findings.filter((f) => f.rule === 'INV-CLOCK');
        expect(clockFindings.length).toBeGreaterThan(0);
        expect(clockFindings[0]?.message).toContain('Zero-argument new Date()');
      },
    );
  });

  it('INV-CLOCK allows Date.now outside the pure packages', async () => {
    await makeTree(
      {
        'apps/app/src/clock.ts': 'export const now = Date.now();',
      },
      (root) => {
        const { findings } = runInvariants({ root, config });
        const clockFindings = findings.filter((f) => f.rule === 'INV-CLOCK');
        expect(clockFindings).toHaveLength(0);
      },
    );
  });

  it('INV-CLOCK still flags Date.now inside the astro directory', async () => {
    await makeTree(
      {
        'packages/engine/src/astro/test.ts': 'export const t = Date.now();',
      },
      (root) => {
        const { findings } = runInvariants({ root, config });
        const clockFindings = findings.filter((f) => f.rule === 'INV-CLOCK');
        expect(clockFindings.length).toBeGreaterThan(0);
        expect(clockFindings[0]?.message).toContain('Date.now()');
      },
    );
  });
});
