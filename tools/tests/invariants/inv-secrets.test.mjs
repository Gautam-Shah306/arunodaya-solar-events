import { describe, expect, it } from 'vitest';
import { runInvariants } from '../../lib/invariants/index.mjs';
import { makeTree } from '../helpers.mjs';

const config = { requiredDocs: [] };

describe('INV-SECRETS', () => {
  it('INV-SECRETS flags a keystore file', async () => {
    await makeTree(
      {
        'android/release.keystore': 'dummy binary keystore data',
        'config/local.properties': 'sdk.dir=/android',
        'assets/logo.png': Buffer.from([0, 1, 2, 3]),
      },
      (root) => {
        const { findings } = runInvariants({ root, config });
        const secretFindings = findings.filter((f) => f.rule === 'INV-SECRETS');
        expect(secretFindings.length).toBeGreaterThanOrEqual(2);
        expect(secretFindings[0]?.message).toContain('Sensitive configuration');
      },
    );
  });

  it('INV-SECRETS flags an env file', async () => {
    await makeTree(
      {
        '.env.production': 'SECRET_KEY=12345',
      },
      (root) => {
        const { findings } = runInvariants({ root, config });
        const secretFindings = findings.filter((f) => f.rule === 'INV-SECRETS');
        expect(secretFindings.length).toBeGreaterThan(0);
        expect(secretFindings[0]?.message).toContain('Sensitive configuration');
      },
    );
  });

  it('INV-SECRETS flags a PEM private key header in a text file', async () => {
    const pemHeader = '-----BEGIN ' + 'RSA PRIVATE KEY-----';
    await makeTree(
      {
        'certs/key.pem': `${pemHeader}\nMIIEowIBAAKCAQEA0\n-----END RSA PRIVATE KEY-----`,
      },
      (root) => {
        const { findings } = runInvariants({ root, config });
        const secretFindings = findings.filter((f) => f.rule === 'INV-SECRETS');
        expect(secretFindings.length).toBeGreaterThan(0);
        expect(secretFindings[0]?.message).toContain('PEM private key header');
      },
    );
  });
});
