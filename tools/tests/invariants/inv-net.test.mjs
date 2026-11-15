import { describe, expect, it } from 'vitest';
import { runInvariants } from '../../lib/invariants/index.mjs';
import { makeTree } from '../helpers.mjs';

const config = {
  requiredDocs: [],
  allow: [
    {
      rule: 'INV-NET',
      path: 'apps/app/src/allowlisted-fetch.ts',
      reason: 'Allowlisted test file for fetch network testing',
    },
  ],
};

describe('INV-NET', () => {
  it('INV-NET flags XMLHttpRequest', async () => {
    await makeTree(
      {
        'apps/app/src/req.ts': 'const xhr = new XMLHttpRequest();',
      },
      (root) => {
        const { findings } = runInvariants({ root, config });
        const netFindings = findings.filter((f) => f.rule === 'INV-NET');
        expect(netFindings.length).toBeGreaterThan(0);
        expect(netFindings[0].message).toContain('XMLHttpRequest');
      },
    );
  });

  it('INV-NET flags WebSocket EventSource and sendBeacon', async () => {
    await makeTree(
      {
        'apps/app/src/stream.ts': `
          const ws = new WebSocket("ws://example.com");
          const es = new EventSource("events");
          navigator.sendBeacon("endpoint", "data");
        `,
      },
      (root) => {
        const { findings } = runInvariants({ root, config });
        const netFindings = findings.filter((f) => f.rule === 'INV-NET');
        expect(netFindings.length).toBeGreaterThanOrEqual(3);
      },
    );
  });

  it('INV-NET flags an absolute https URL string in source', async () => {
    await makeTree(
      {
        'packages/engine/src/api.ts': 'export const endpoint = "https://api.example.com/solar";',
      },
      (root) => {
        const { findings } = runInvariants({ root, config });
        const netFindings = findings.filter((f) => f.rule === 'INV-NET');
        expect(netFindings.length).toBeGreaterThan(0);
        expect(netFindings[0].message).toContain('Remote URL literal');
      },
    );
  });

  it('INV-NET allows the SVG namespace URL', async () => {
    await makeTree(
      {
        'apps/app/src/icon.ts': 'export const ns = "http://www.w3.org/2000/svg";',
      },
      (root) => {
        const { findings } = runInvariants({ root, config });
        const netFindings = findings.filter((f) => f.rule === 'INV-NET');
        expect(netFindings).toHaveLength(0);
      },
    );
  });

  it('INV-NET flags fetch unless the file is allowlisted', async () => {
    await makeTree(
      {
        'apps/app/src/normal.ts': 'fetch("url");',
        'apps/app/src/allowlisted-fetch.ts': 'fetch("url");',
      },
      (root) => {
        const { findings } = runInvariants({ root, config });
        const netFindings = findings.filter((f) => f.rule === 'INV-NET');
        expect(netFindings.some((f) => f.path === 'apps/app/src/normal.ts')).toBe(true);
        expect(netFindings.some((f) => f.path === 'apps/app/src/allowlisted-fetch.ts')).toBe(false);
      },
    );
  });
});
