import { describe, expect, it } from 'vitest';
import { runInvariants } from '../../lib/invariants/index.mjs';
import { makeTree } from '../helpers.mjs';

const baseConfig = {
  requiredDocs: [],
  allow: [
    {
      rule: 'INV-TIME',
      path: 'packages/engine/src/time/ist.ts',
      reason: 'Allowlisted IST time calculation helper module',
    },
  ],
};

describe('INV-TIME', () => {
  it('INV-TIME flags getHours outside the IST helper', async () => {
    await makeTree(
      {
        'packages/engine/src/foo.ts':
          'const d = new Date(12345); const h = d.getHours(); const h2 = d["getHours"]();',
      },
      (root) => {
        const { findings } = runInvariants({ root, config: baseConfig });
        const timeFindings = findings.filter((f) => f.rule === 'INV-TIME');
        expect(timeFindings.length).toBeGreaterThanOrEqual(2);
        expect(timeFindings[0]?.message).toContain('getHours');
      },
    );
  });

  it('INV-TIME ignores getHours inside the allowlisted IST helper path', async () => {
    await makeTree(
      {
        'packages/engine/src/time/ist.ts': 'const d = new Date(12345); const h = d.getHours();',
      },
      (root) => {
        const { findings } = runInvariants({ root, config: baseConfig });
        const timeFindings = findings.filter((f) => f.rule === 'INV-TIME');
        expect(timeFindings).toHaveLength(0);
      },
    );
  });

  it('INV-TIME flags toLocaleTimeString', async () => {
    await makeTree(
      {
        'apps/app/src/view.ts': 'const d = new Date(12345); const s = d.toLocaleTimeString();',
      },
      (root) => {
        const { findings } = runInvariants({ root, config: baseConfig });
        const timeFindings = findings.filter((f) => f.rule === 'INV-TIME');
        expect(timeFindings.length).toBeGreaterThan(0);
        expect(timeFindings[0]?.message).toContain('toLocaleTimeString');
      },
    );
  });

  it('INV-TIME flags multi-argument new Date', async () => {
    await makeTree(
      {
        'packages/engine/src/calc.ts': 'const d = new Date(2026, 10, 15);',
      },
      (root) => {
        const { findings } = runInvariants({ root, config: baseConfig });
        const timeFindings = findings.filter((f) => f.rule === 'INV-TIME');
        expect(timeFindings.length).toBeGreaterThan(0);
        expect(timeFindings[0]?.message).toContain('Multi-argument new Date');
      },
    );
  });

  it('INV-TIME flags Intl.DateTimeFormat outside the helper', async () => {
    await makeTree(
      {
        'apps/app/src/format.ts': 'const fmt = new Intl.DateTimeFormat();',
      },
      (root) => {
        const { findings } = runInvariants({ root, config: baseConfig });
        const timeFindings = findings.filter((f) => f.rule === 'INV-TIME');
        expect(timeFindings.length).toBeGreaterThan(0);
        expect(timeFindings[0]?.message).toContain('Intl.DateTimeFormat');
      },
    );
  });

  it('INV-TIME ignores banned names inside comments and string literals', async () => {
    await makeTree(
      {
        'packages/engine/src/safe.ts': `
          // getHours and toLocaleTimeString should not trigger findings here
          const info = "We never use getHours or toLocaleDateString";
        `,
      },
      (root) => {
        const { findings } = runInvariants({ root, config: baseConfig });
        const timeFindings = findings.filter((f) => f.rule === 'INV-TIME');
        expect(timeFindings).toHaveLength(0);
      },
    );
  });
});
