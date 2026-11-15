import { describe, expect, it } from 'vitest';
import { runInvariants } from '../../lib/invariants/index.mjs';
import { makeTree } from '../helpers.mjs';

const config = { requiredDocs: [] };

describe('INV-LAYERS', () => {
  it('INV-LAYERS flags engine importing from an app', async () => {
    await makeTree(
      {
        'packages/engine/src/bad.ts':
          'import { view } from "@arunodaya/app"; export { x } from "@arunodaya/app";',
      },
      (root) => {
        const { findings } = runInvariants({ root, config });
        const layerFindings = findings.filter((f) => f.rule === 'INV-LAYERS');
        expect(layerFindings.length).toBeGreaterThanOrEqual(2);
        expect(layerFindings[0]?.message).toContain('packages cannot import from apps');
      },
    );
  });

  it('INV-LAYERS flags engine importing a third-party package', async () => {
    await makeTree(
      {
        'packages/engine/src/calc.ts':
          'import suncalc from "suncalc"; const a = import("lodash"); const b = require("mathjs");',
      },
      (root) => {
        const { findings } = runInvariants({ root, config });
        const layerFindings = findings.filter((f) => f.rule === 'INV-LAYERS');
        expect(layerFindings.length).toBeGreaterThanOrEqual(3);
        expect(layerFindings[0]?.message).toContain('Engine layer violation');
      },
    );
  });

  it('INV-LAYERS flags DOM globals in engine', async () => {
    await makeTree(
      {
        'packages/engine/src/dom.ts':
          'export const w = window.innerWidth; export const d = document.title;',
      },
      (root) => {
        const { findings } = runInvariants({ root, config });
        const layerFindings = findings.filter((f) => f.rule === 'INV-LAYERS');
        expect(layerFindings.length).toBeGreaterThanOrEqual(2);
        expect(layerFindings[0]?.message).toContain('Host/DOM global');
      },
    );
  });

  it('INV-LAYERS allows engine importing contracts', async () => {
    await makeTree(
      {
        'packages/engine/src/good.ts':
          'import { SCHEMA_VERSIONS } from "@arunodaya/contracts"; export const v = SCHEMA_VERSIONS;',
      },
      (root) => {
        const { findings } = runInvariants({ root, config });
        const layerFindings = findings.filter((f) => f.rule === 'INV-LAYERS');
        expect(layerFindings).toHaveLength(0);
      },
    );
  });

  it('INV-LAYERS flags contracts importing engine', async () => {
    await makeTree(
      {
        'packages/contracts/src/bad.ts': 'import { ENGINE_API_VERSION } from "@arunodaya/engine";',
        'packages/themes/src/bad.ts': 'import { x } from "external-pkg";',
      },
      (root) => {
        const { findings } = runInvariants({ root, config });
        const layerFindings = findings.filter((f) => f.rule === 'INV-LAYERS');
        expect(layerFindings.length).toBeGreaterThanOrEqual(2);
        expect(layerFindings[0]?.message).toContain('Contracts layer violation');
      },
    );
  });
});
