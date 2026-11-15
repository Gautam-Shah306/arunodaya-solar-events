import { describe, expect, it } from 'vitest';
import { runInvariants } from '../../lib/invariants/index.mjs';
import { checkInvLf } from '../../lib/invariants/rule-lf.mjs';
import { makeTree } from '../helpers.mjs';

const config = { requiredDocs: [] };

describe('INV-LF', () => {
  it('INV-LF flags CRLF in a source file', async () => {
    await makeTree(
      {
        'apps/app/src/index.ts': 'const a = 1;\r\nconst b = 2;\n',
        'docs/spec/ARUNODAYA-SPEC.md': 'Title\r\nContent\n',
      },
      (root) => {
        const { findings } = runInvariants({ root, config });
        const lfFindings = findings.filter((f) => f.rule === 'INV-LF');
        expect(lfFindings.length).toBeGreaterThan(0);
        expect(lfFindings[0]?.message).toContain('CRLF line ending detected');

        const specIncludedFindings = checkInvLf(
          root,
          ['apps/app/src/index.ts', 'docs/spec/ARUNODAYA-SPEC.md'],
          { excludeSpecFromLF: false },
        );
        expect(specIncludedFindings.length).toBe(2);
      },
    );
  });
});
