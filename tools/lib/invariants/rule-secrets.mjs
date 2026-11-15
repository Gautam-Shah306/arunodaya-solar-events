import fs from 'node:fs';
import path from 'node:path';

const SENSITIVE_BASENAMES = new Set(['.env', 'local.properties', 'google-services.json']);
const SENSITIVE_EXTENSIONS = new Set(['.jks', '.keystore']);
const PEM_PRIVATE_KEY_REGEX = /-----BEGIN [A-Z0-9_\-\s]*PRIVATE KEY-----/;

/**
 * Checks INV-SECRETS across repository files
 * @param {string} root
 * @param {string[]} relFiles
 * @returns {Array<{ rule: string, path: string, line: number, message: string }>}
 */
export function checkInvSecrets(root, relFiles) {
  /** @type {Array<{ rule: string, path: string, line: number, message: string }>} */
  const findings = [];

  for (const relPath of relFiles) {
    const baseName = path.basename(relPath);
    const ext = path.extname(relPath);

    // File name checks
    if (
      SENSITIVE_BASENAMES.has(baseName) ||
      baseName.startsWith('.env.') ||
      SENSITIVE_EXTENSIONS.has(ext)
    ) {
      findings.push({
        rule: 'INV-SECRETS',
        path: relPath,
        line: 1,
        message: `Sensitive configuration / credential file '${baseName}' detected in repository`,
      });
      continue;
    }

    // Text content checks for PEM private keys
    const fullPath = path.join(root, relPath);
    try {
      const buffer = fs.readFileSync(fullPath);
      // Skip if likely binary (contains null bytes in first 1024 bytes)
      const isBinary = buffer.subarray(0, 1024).includes(0);
      if (isBinary) continue;

      const content = buffer.toString('utf8');
      if (PEM_PRIVATE_KEY_REGEX.test(content)) {
        const lines = content.split('\n');
        for (let i = 0; i < lines.length; i++) {
          const lineText = lines[i] ?? '';
          if (PEM_PRIVATE_KEY_REGEX.test(lineText)) {
            findings.push({
              rule: 'INV-SECRETS',
              path: relPath,
              line: i + 1,
              message: 'PEM private key header detected in file',
            });
            break;
          }
        }
      }
    } catch {
      // Ignore read errors
    }
  }

  return findings;
}
