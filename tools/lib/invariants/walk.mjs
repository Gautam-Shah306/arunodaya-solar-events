import fs from 'node:fs';
import path from 'node:path';

const IGNORED_DIRS = new Set(['node_modules', 'dist', 'coverage', '.git', '.vite']);
const CODE_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.mjs', '.cjs', '.html', '.css']);

/**
 * Normalizes a path to forward slashes relative to root
 * @param {string} root
 * @param {string} fullPath
 * @returns {string}
 */
export function toRelPath(root, fullPath) {
  const normRoot = path.resolve(root).replace(/\\/g, '/').replace(/\/+$/, '');
  const normFull = path.resolve(fullPath).replace(/\\/g, '/');

  if (normFull.toLowerCase().startsWith(normRoot.toLowerCase())) {
    return normFull.slice(normRoot.length).replace(/^\/+/, '');
  }
  return path.relative(path.resolve(root), path.resolve(fullPath)).replace(/\\/g, '/');
}

/**
 * Recursively walks all repository files excluding build/vcs caches
 * @param {string} dir
 * @param {string} root
 * @param {string[]} acc
 * @returns {string[]} Relative paths with forward slashes
 */
export function walkRepoFiles(dir, root = dir, acc = []) {
  if (!fs.existsSync(dir)) return acc;
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    if (IGNORED_DIRS.has(entry.name)) continue;
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      walkRepoFiles(fullPath, root, acc);
    } else if (entry.isFile()) {
      acc.push(toRelPath(root, fullPath));
    }
  }

  return acc;
}

/**
 * Walks code files under apps/ and packages/
 * @param {string} root
 * @returns {string[]} Relative paths with forward slashes
 */
export function walkCodeFiles(root) {
  const all = walkRepoFiles(root);
  return all.filter((relPath) => {
    if (!relPath.startsWith('apps/') && !relPath.startsWith('packages/')) {
      return false;
    }
    const parts = relPath.split('/');
    if (parts.includes('tests')) return false;

    const baseName = path.basename(relPath);
    if (baseName.includes('.test.') || baseName.includes('.spec.')) return false;

    const ext = path.extname(relPath);
    return CODE_EXTENSIONS.has(ext);
  });
}
