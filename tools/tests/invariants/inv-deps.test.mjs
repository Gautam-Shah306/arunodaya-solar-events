import { describe, expect, it } from 'vitest';
import { runInvariants } from '../../lib/invariants/index.mjs';
import { makeTree } from '../helpers.mjs';

const config = { requiredDocs: [] };

describe('INV-DEPS', () => {
  it('INV-DEPS flags a caret range', async () => {
    await makeTree(
      {
        'package.json': JSON.stringify({
          name: 'test-root',
          dependencies: {
            lodash: '^4.17.21',
            empty: '',
          },
        }),
      },
      (root) => {
        const { findings } = runInvariants({ root, config });
        const depFindings = findings.filter((f) => f.rule === 'INV-DEPS');
        expect(depFindings.length).toBeGreaterThanOrEqual(2);
        expect(depFindings[0]?.message).toContain('exact pinning required');
      },
    );
  });

  it('INV-DEPS flags latest and star', async () => {
    await makeTree(
      {
        'package.json': JSON.stringify({
          name: 'test-root',
          dependencies: {
            foo: 'latest',
            bar: '*',
          },
        }),
      },
      (root) => {
        const { findings } = runInvariants({ root, config });
        const depFindings = findings.filter((f) => f.rule === 'INV-DEPS');
        expect(depFindings.length).toBeGreaterThanOrEqual(2);
        expect(depFindings[0]?.message).toContain('unpinned version');
      },
    );
  });

  it('INV-DEPS accepts exact versions and the workspace version', async () => {
    await makeTree(
      {
        'package.json': JSON.stringify({
          name: 'root',
          version: '0.1.0',
          dependencies: {
            lodash: '4.17.21',
            '@arunodaya/contracts': '0.1.0',
          },
        }),
        'packages/contracts/package.json': JSON.stringify({
          name: '@arunodaya/contracts',
          version: '0.1.0',
        }),
      },
      (root) => {
        const { findings } = runInvariants({ root, config });
        const depFindings = findings.filter((f) => f.rule === 'INV-DEPS');
        expect(depFindings).toHaveLength(0);
      },
    );
  });
});
