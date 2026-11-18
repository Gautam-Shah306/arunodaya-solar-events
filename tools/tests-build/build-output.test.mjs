import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { beforeAll, describe, expect, it } from 'vitest';
import { buildApp } from '../build-app.mjs';
import {
  ASTRONOMY_DISTINCTIVE_STRING,
  BUNDLE_BUDGETS,
  calculateFirstLoadJs,
} from '../lib/bundle-budgets.mjs';
import { CSP_POLICY } from '../lib/csp.mjs';

describe('build-output', () => {
  const pagesDist = path.resolve('apps/app/dist/pages');
  const androidDist = path.resolve('apps/app/dist/android');

  beforeAll(async () => {
    await buildApp('pages');
    await buildApp('android');
  });

  it('pages build references assets under the repository base path', () => {
    const htmlPath = path.join(pagesDist, 'index.html');
    expect(fs.existsSync(htmlPath)).toBe(true);

    const html = fs.readFileSync(htmlPath, 'utf8');
    expect(html).toContain('/arunodaya-solar-events/');
    expect(html).toMatch(/src=["']\/arunodaya-solar-events\/assets\//);
  });

  it('android build references assets with relative paths', () => {
    const htmlPath = path.join(androidDist, 'index.html');
    expect(fs.existsSync(htmlPath)).toBe(true);

    const html = fs.readFileSync(htmlPath, 'utf8');
    expect(html).not.toContain('/arunodaya-solar-events/');
    expect(html).toMatch(/src=["']\.\/assets\//);
  });

  it('built index.html carries the CSP meta tag and no inline scripts', () => {
    const htmlPath = path.join(pagesDist, 'index.html');
    const html = fs.readFileSync(htmlPath, 'utf8');

    expect(html).toContain('<meta http-equiv="Content-Security-Policy"');
    expect(html).toContain(CSP_POLICY);

    // No inline scripts with executable code
    const scriptMatches = [...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi)];
    for (const match of scriptMatches) {
      const inlineCode = match[1]?.trim() ?? '';
      expect(inlineCode).toBe('');
    }
  });

  it('pages build generates components gallery html', () => {
    const componentsHtmlPath = path.join(pagesDist, 'components.html');
    expect(fs.existsSync(componentsHtmlPath)).toBe(true);

    const html = fs.readFileSync(componentsHtmlPath, 'utf8');
    expect(html).toContain('/arunodaya-solar-events/');
    expect(html).toMatch(/src=["']\/arunodaya-solar-events\/assets\//);
  });

  it('components gallery is not part of the android build', () => {
    const compAndroidPath = path.join(androidDist, 'components.html');
    expect(fs.existsSync(compAndroidPath)).toBe(false);
  });

  it('early-theme script is copied to dist and referenced before any styles', () => {
    const pagesEarlyTheme = path.join(pagesDist, 'early-theme.js');
    const androidEarlyTheme = path.join(androidDist, 'early-theme.js');

    expect(fs.existsSync(pagesEarlyTheme)).toBe(true);
    expect(fs.existsSync(androidEarlyTheme)).toBe(true);

    // Verify early-theme is referenced before any <link rel="stylesheet"> in index.html
    const html = fs.readFileSync(path.join(pagesDist, 'index.html'), 'utf8');
    const scriptIndex = html.indexOf('early-theme.js');
    const firstStyleIndex = html.indexOf('rel="stylesheet"');

    expect(scriptIndex).toBeGreaterThan(-1);
    expect(firstStyleIndex).toBeGreaterThan(-1);
    expect(scriptIndex).toBeLessThan(firstStyleIndex);
  });

  it('bundled woff2 font files exist in assets and are referenced by font-face', () => {
    const pagesAssets = path.join(pagesDist, 'assets');
    const files = fs.readdirSync(pagesAssets);
    const woff2Files = files.filter((f) => f.endsWith('.woff2'));

    expect(woff2Files.length).toBeGreaterThanOrEqual(2);

    const cssFiles = files.filter((f) => f.endsWith('.css'));
    let combinedCss = '';
    for (const cssFile of cssFiles) {
      combinedCss += fs.readFileSync(path.join(pagesAssets, cssFile), 'utf8');
    }

    expect(combinedCss).toContain('@font-face');
    for (const font of woff2Files) {
      expect(combinedCss).toContain(font);
    }
  });

  it('worker bundle is emitted as a separate chunk', () => {
    const pagesAssets = path.join(pagesDist, 'assets');
    const files = fs.readdirSync(pagesAssets);
    const workerFile = files.find((f) => f.startsWith('snapshot.worker-') && f.endsWith('.js'));

    expect(workerFile).toBeDefined();
  });

  it('first-load JavaScript for the pages target stays under its recorded budget', () => {
    const pagesFirstLoad = calculateFirstLoadJs('pages');
    expect(pagesFirstLoad.files.length).toBeGreaterThan(0);
    expect(pagesFirstLoad.totalGzipBytes).toBeLessThanOrEqual(BUNDLE_BUDGETS.pagesGzipBytes);
  });

  it('first-load JavaScript for the android target stays under its recorded budget', () => {
    const androidFirstLoad = calculateFirstLoadJs('android');
    expect(androidFirstLoad.files.length).toBeGreaterThan(0);
    expect(androidFirstLoad.totalGzipBytes).toBeLessThanOrEqual(BUNDLE_BUDGETS.androidGzipBytes);
  });

  it('astronomy code is only in the worker chunk and the lazy fallback chunk', () => {
    const pagesAssets = path.join(pagesDist, 'assets');
    const jsFiles = fs.readdirSync(pagesAssets).filter((f) => f.endsWith('.js'));

    const workerFile = jsFiles.find((f) => f.startsWith('snapshot.worker-'));
    const fallbackFile = jsFiles.find((f) => f.startsWith('request-handler-'));

    expect(workerFile).toBeDefined();
    expect(fallbackFile).toBeDefined();

    // Verify distinctive astronomy string is present in worker and fallback chunks
    const workerContent = fs.readFileSync(path.join(pagesAssets, workerFile || ''), 'utf8');
    const fallbackContent = fs.readFileSync(path.join(pagesAssets, fallbackFile || ''), 'utf8');

    expect(workerContent).toContain(ASTRONOMY_DISTINCTIVE_STRING);
    expect(fallbackContent).toContain(ASTRONOMY_DISTINCTIVE_STRING);

    // Verify absent from every other chunk
    for (const jsFile of jsFiles) {
      if (jsFile === workerFile || jsFile === fallbackFile) continue;
      const content = fs.readFileSync(path.join(pagesAssets, jsFile), 'utf8');
      expect(content).not.toContain(ASTRONOMY_DISTINCTIVE_STRING);
    }
  });

  it('components gallery bundle stays under 90 KB gzip', () => {
    const assetsDir = path.join(pagesDist, 'assets');
    const files = fs.readdirSync(assetsDir);
    const compJsFile = files.find((f) => f.startsWith('components-') && f.endsWith('.js'));
    expect(compJsFile).toBeDefined();

    const content = fs.readFileSync(path.join(assetsDir, compJsFile || ''));
    const gzipSize = zlib.gzipSync(content).length;

    // Must stay under 90 KB (92160 bytes)
    expect(gzipSize).toBeLessThanOrEqual(92160);
  });

  it('built home page references no remote URLs and no inline styles', () => {
    const htmlPath = path.join(pagesDist, 'index.html');
    const html = fs.readFileSync(htmlPath, 'utf8');

    // No remote URLs
    expect(html).not.toMatch(/https?:\/\//i);
    expect(html).not.toMatch(/src=["']\/\/[^"']+/i);
    expect(html).not.toMatch(/href=["']\/\/[^"']+/i);

    // No inline styles
    expect(html).not.toMatch(/\sstyle=["'][^"']*["']/i);
  });

  it('android build includes the home screen and excludes the simulated time banner text', () => {
    const androidAssets = path.join(androidDist, 'assets');
    const jsFiles = fs.readdirSync(androidAssets).filter((f) => f.endsWith('.js'));

    let foundHome = false;
    let foundSimulatedBannerText = false;

    for (const jsFile of jsFiles) {
      const content = fs.readFileSync(path.join(androidAssets, jsFile), 'utf8');
      if (content.includes('Navkarshi') || content.includes('Civil Dawn')) {
        foundHome = true;
      }
      if (content.includes('Simulated time:')) {
        foundSimulatedBannerText = true;
      }
    }

    expect(foundHome).toBe(true);
    expect(foundSimulatedBannerText).toBe(false);
  });
});
