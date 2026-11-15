import { describe, expect, it } from 'vitest';
import { runInvariants } from '../../lib/invariants/index.mjs';
import { checkInvLicense } from '../../lib/invariants/rule-license.mjs';
import { makeTree } from '../helpers.mjs';

const config = {
  requiredDocs: [],
  licenseAllowlist: ['MIT', 'Apache-2.0'],
};

describe('INV-LICENSE', () => {
  it('INV-LICENSE flags a production dependency with a non-allowlisted licence', async () => {
    await makeTree(
      {
        'package-lock.json': JSON.stringify({
          name: 'test',
          lockfileVersion: 3,
          packages: {
            'node_modules/gpl-pkg': {
              version: '1.0.0',
              license: 'GPL-3.0',
            },
          },
        }),
      },
      (root) => {
        const { findings } = runInvariants({ root, config });
        const licFindings = findings.filter((f) => f.rule === 'INV-LICENSE');
        expect(licFindings.length).toBeGreaterThan(0);
        expect(licFindings[0]?.message).toContain('non-allowlisted licence');
      },
    );
  });

  it('INV-LICENSE ignores dev-only dependencies', async () => {
    await makeTree(
      {
        'package-lock.json': JSON.stringify({
          name: 'test',
          lockfileVersion: 3,
          packages: {
            'node_modules/dev-tool': {
              version: '1.0.0',
              dev: true,
              license: 'GPL-3.0',
            },
          },
        }),
      },
      (root) => {
        const { findings } = runInvariants({ root, config });
        const licFindings = findings.filter((f) => f.rule === 'INV-LICENSE');
        expect(licFindings).toHaveLength(0);
      },
    );
  });

  it('INV-LICENSE accepts an SPDX OR expression when one branch is allowlisted', async () => {
    await makeTree(
      {
        'package-lock.json': JSON.stringify({
          name: 'test',
          lockfileVersion: 3,
          packages: {
            'node_modules/dual-licensed': {
              version: '1.0.0',
              license: '(MIT OR GPL-3.0)',
            },
          },
        }),
      },
      (root) => {
        const { findings } = runInvariants({ root, config });
        const licFindings = findings.filter((f) => f.rule === 'INV-LICENSE');
        expect(licFindings).toHaveLength(0);

        const noLockRes = checkInvLicense(root + '-nonexistent', config);
        expect(noLockRes).toHaveLength(0);
      },
    );
  });
});
