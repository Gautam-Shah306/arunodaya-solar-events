import fs from 'node:fs';
import path from 'node:path';

export const BOM_EXTENSIONS = new Set([
  '.ts',
  '.tsx',
  '.js',
  '.mjs',
  '.cjs',
  '.html',
  '.css',
  '.json',
  '.md',
  '.yml',
  '.yaml',
  '.txt',
]);

/**
 * Checks for UTF-8 and UTF-16 Byte Order Marks (BOM) across text files
 * @param {string} root
 * @param {string[]} relFiles
 * @returns {Array<{ rule: string, path: string, line: number, message: string }>}
 */
export function checkInvBom(root, relFiles) {
  /** @type {Array<{ rule: string, path: string, line: number, message: string }>} */
  const findings = [];

  for (const relPath of relFiles) {
    const ext = path.extname(relPath).toLowerCase();
    if (!BOM_EXTENSIONS.has(ext)) {
      continue;
    }

    const fullPath = path.join(root, relPath);
    try {
      const buf = fs.readFileSync(fullPath);
      if (buf.length >= 3 && buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf) {
        findings.push({
          rule: 'INV-BOM',
          path: relPath,
          line: 1,
          message:
            'UTF-8 byte order mark (BOM) detected; repository standard requires UTF-8 without BOM',
        });
      } else if (
        buf.length >= 2 &&
        ((buf[0] === 0xfe && buf[1] === 0xff) || (buf[0] === 0xff && buf[1] === 0xfe))
      ) {
        findings.push({
          rule: 'INV-BOM',
          path: relPath,
          line: 1,
          message:
            'UTF-16 byte order mark (BOM) detected; repository standard requires UTF-8 without BOM',
        });
      }
    } catch {
      // Ignore read errors
    }
  }

  return findings;
}
