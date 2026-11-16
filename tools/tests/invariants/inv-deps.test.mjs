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

  it('astronomy-engine version is identical in the root devDependencies and the engine package', async () => {
    const fs = await import('node:fs');
    const path = await import('node:path');
    const rootPkg = JSON.parse(fs.readFileSync(path.resolve('package.json'), 'utf8'));
    const enginePkg = JSON.parse(
      fs.readFileSync(path.resolve('packages/engine/package.json'), 'utf8'),
    );
    expect(rootPkg.devDependencies['astronomy-engine']).toBeDefined();
    expect(enginePkg.dependencies['astronomy-engine']).toBeDefined();
    expect(rootPkg.devDependencies['astronomy-engine']).toBe(
      enginePkg.dependencies['astronomy-engine'],
    );
  });

  it('tolerances are defined once in the shared json file', async () => {
    const fs = await import('node:fs');
    const path = await import('node:path');
    const { REGRESSION_GUARD, TOLERANCES } = await import('../../lib/astro-tolerances.mjs');
    const sharedPath = path.resolve('packages/engine/tests/data/astro-tolerances-v1.json');
    expect(fs.existsSync(sharedPath)).toBe(true);
    const raw = JSON.parse(fs.readFileSync(sharedPath, 'utf8'));
    expect(raw.tolerances).toEqual(TOLERANCES);
    expect(raw.regressionGuard).toEqual(REGRESSION_GUARD);
  });
});
