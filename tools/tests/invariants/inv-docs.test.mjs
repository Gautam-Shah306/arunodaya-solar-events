import { describe, expect, it } from 'vitest';
import { runInvariants } from '../../lib/invariants/index.mjs';
import { checkInvDocs } from '../../lib/invariants/rule-docs.mjs';
import { makeTree } from '../helpers.mjs';

describe('INV-DOCS', () => {
  it('INV-DOCS flags a missing required document', async () => {
    await makeTree(
      {
        'README.md': '# Arunodaya',
      },
      (root) => {
        const { findings } = runInvariants({
          root,
          config: {
            requiredDocs: ['README.md', 'LICENSE', 'NOTICE'],
          },
        });
        const docFindings = findings.filter((f) => f.rule === 'INV-DOCS');
        expect(docFindings.some((f) => f.path === 'LICENSE')).toBe(true);
        expect(docFindings.some((f) => f.path === 'NOTICE')).toBe(true);
        expect(docFindings.some((f) => f.path === 'README.md')).toBe(false);

        const defaultFindings = checkInvDocs(root);
        expect(defaultFindings.length).toBeGreaterThan(0);
      },
    );
  });
});
