import fs from 'node:fs';
import path from 'node:path';

const LF_EXTENSIONS = new Set([
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
  '.py',
]);

/**
 * Checks INV-LF across text files
 * @param {string} root
 * @param {string[]} relFiles
 * @param {any} [config]
 * @returns {Array<{ rule: string, path: string, line: number, message: string }>}
 */
export function checkInvLf(root, relFiles, config = {}) {
  /** @type {Array<{ rule: string, path: string, line: number, message: string }>} */
  const findings = [];
  const excludeSpec = config?.excludeSpecFromLF ?? config?.excludeSpec ?? false;

  for (const relPath of relFiles) {
    if (excludeSpec && relPath.startsWith('docs/spec/')) {
      continue;
    }

    const ext = path.extname(relPath);
    if (!LF_EXTENSIONS.has(ext)) continue;

    const fullPath = path.join(root, relPath);
    try {
      const buf = fs.readFileSync(fullPath);
      const str = buf.toString('utf8');
      const crlfIndex = str.indexOf('\r\n');
      if (crlfIndex !== -1) {
        // Find line number
        const lineNum = str.substring(0, crlfIndex).split('\n').length;
        findings.push({
          rule: 'INV-LF',
          path: relPath,
          line: lineNum,
          message: 'CRLF line ending detected; repository standard requires LF everywhere',
        });
      }
    } catch {
      // Ignore read errors
    }
  }

  return findings;
}
