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
 * Computed as ceil(measured * 1.15) after Prompt 7 Home screen additions.
 * Hard ceiling is 110 KB gzip (112,640 B) for pages.
 */
export const BUNDLE_BUDGETS = {
  // Pages measured: 87,788 B gzip (~85.73 kB) -> budget: ceil(87,788 * 1.15) = 100,957 B
  pagesGzipBytes: 100_957,
  // Android measured: 87,177 B gzip (~85.13 kB) -> budget: ceil(87,177 * 1.15) = 100,254 B
  androidGzipBytes: 100_254,
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

  // Match all script tags with a src and modulepreload links
  const scriptRegex = /<script\s+[^>]*src=["']([^"']+)["']/gi;
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
    let fullPath = path.join(assetsDir, file);
    if (!fs.existsSync(fullPath)) {
      fullPath = path.join(distDir, file);
    }
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
