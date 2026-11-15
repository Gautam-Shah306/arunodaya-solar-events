import { describe, expect, it } from 'vitest';
import { runInvariants } from '../../lib/invariants/index.mjs';
import { makeTree } from '../helpers.mjs';

const config = { requiredDocs: [] };

describe('INV-COLOR', () => {
  it('INV-COLOR flags a hex colour literal outside packages/themes', async () => {
    await makeTree(
      {
        'apps/app/src/style.ts': 'export const bg = "#ffffff"; const t = `color: ${bg} #fff`;',
      },
      (root) => {
        const { findings } = runInvariants({ root, config });
        const colorFindings = findings.filter((f) => f.rule === 'INV-COLOR');
        expect(colorFindings.length).toBeGreaterThan(0);
        expect(colorFindings[0]?.message).toContain('Hex color literal');
      },
    );
  });

  it('INV-COLOR flags rgb and hsl function strings outside packages/themes', async () => {
    await makeTree(
      {
        'apps/app/src/style.ts':
          'export const c1 = "rgb(255, 0, 0)"; export const c2 = "hsl(120, 50%, 50%)";',
      },
      (root) => {
        const { findings } = runInvariants({ root, config });
        const colorFindings = findings.filter((f) => f.rule === 'INV-COLOR');
        expect(colorFindings.length).toBeGreaterThanOrEqual(2);
      },
    );
  });

  it('INV-COLOR allows hex colours inside packages/themes', async () => {
    await makeTree(
      {
        'packages/themes/src/palette.ts': 'export const primary = "#1a3322";',
      },
      (root) => {
        const { findings } = runInvariants({ root, config });
        const colorFindings = findings.filter((f) => f.rule === 'INV-COLOR');
        expect(colorFindings).toHaveLength(0);
      },
    );
  });

  it('INV-COLOR flags a hex colour in a css file', async () => {
    await makeTree(
      {
        'apps/app/src/main.css': 'body { background: #ff0000; color: rgb(0,0,0); }',
      },
      (root) => {
        const { findings } = runInvariants({ root, config });
        const colorFindings = findings.filter((f) => f.rule === 'INV-COLOR');
        expect(colorFindings.length).toBeGreaterThanOrEqual(2);
        expect(colorFindings[0]?.message).toContain('Hex color literal');
      },
    );
  });
});
