import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

/**
 * Distinctive string literal present in astronomy-engine calculation code
 * within the background Web Worker and lazy main-thread fallback chunk.
 */
export const ASTRONOMY_DISTINCTIVE_STRING = 'Invalid observer coordinates';

/**
 * Recorded first-load JavaScript gzip budgets per build target.
 * Computed as ceil(measuredAfterFix * 1.15).
 */
export const BUNDLE_BUDGETS = {
  // Pages measured after fix: 143,300 B gzip -> budget: ceil(143,300 * 1.15) = 164,795 B (~165 kB)
  pagesGzipBytes: 165_000,
  // Android measured after fix: 142,714 B gzip -> budget: ceil(142,714 * 1.15) = 164,122 B (~165 kB)
  androidGzipBytes: 165_000,
};

/**
 * Calculates the total first-load JavaScript gzip size for a build target.
 * First-load JavaScript includes the entry chunk loaded by index.html plus
 * every script chunk imported statically or modulepreloaded.
 *
 * @param {'pages' | 'android'} target
 * @param {string} [appRoot] Path to apps/app
 * @returns {{ files: string[], totalGzipBytes: number, totalRawBytes: number }}
 */
export function calculateFirstLoadJs(target, appRoot = path.resolve('apps/app')) {
  const distDir = path.join(appRoot, 'dist', target);
  const htmlPath = path.join(distDir, 'index.html');

  if (!fs.existsSync(htmlPath)) {
    throw new Error(`index.html not found for target '${target}' at: ${htmlPath}`);
  }

  const html = fs.readFileSync(htmlPath, 'utf8');

  // Match module scripts and modulepreload links
  const scriptRegex = /<script\s+[^>]*type=["']module["'][^>]*src=["']([^"']+)["']/gi;
  const preloadRegex = /<link\s+[^>]*rel=["']modulepreload["'][^>]*href=["']([^"']+)["']/gi;

  const assetFiles = new Set();

  for (const match of html.matchAll(scriptRegex)) {
    if (match[1] && match[1].endsWith('.js')) {
      assetFiles.add(path.basename(match[1]));
    }
  }

  for (const match of html.matchAll(preloadRegex)) {
    if (match[1] && match[1].endsWith('.js')) {
      assetFiles.add(path.basename(match[1]));
    }
  }

  const assetsDir = path.join(distDir, 'assets');
  let totalGzipBytes = 0;
  let totalRawBytes = 0;
  const files = [];

  for (const file of assetFiles) {
    const fullPath = path.join(assetsDir, file);
    if (fs.existsSync(fullPath)) {
      const buf = fs.readFileSync(fullPath);
      totalRawBytes += buf.length;
      totalGzipBytes += zlib.gzipSync(buf).length;
      files.push(file);
    }
  }

  return {
    files,
    totalRawBytes,
    totalGzipBytes,
  };
}
