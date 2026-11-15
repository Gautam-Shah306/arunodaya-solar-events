import fs from 'node:fs';
import path from 'node:path';

const DEFAULT_REQUIRED_DOCS = [
  'README.md',
  'LICENSE',
  'NOTICE',
  'docs/AGENT-RULES.md',
  'docs/TOOLCHAIN.md',
  'docs/ARCHITECTURE.md',
  'docs/PLAN.md',
  'docs/spec/ARUNODAYA-SPEC.md',
  'docs/adr/README.md',
];

/**
 * Checks INV-DOCS rule
 * @param {string} root
 * @param {any} [config]
 * @returns {Array<{ rule: string, path: string, line: number, message: string }>}
 */
export function checkInvDocs(root, config = {}) {
  /** @type {Array<{ rule: string, path: string, line: number, message: string }>} */
  const findings = [];
  const required = config?.requiredDocs || DEFAULT_REQUIRED_DOCS;

  for (const doc of required) {
    const fullPath = path.join(root, doc);
    if (!fs.existsSync(fullPath)) {
      findings.push({
        rule: 'INV-DOCS',
        path: doc,
        line: 1,
        message: `Required documentation file '${doc}' is missing from repository`,
      });
    }
  }

  return findings;
}
