import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { beforeAll, describe, expect, it } from 'vitest';
import { buildApp } from '../build-app.mjs';
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

    // No inline scripts with executable code (only script type=module with src)
    const scriptMatches = [...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi)];
    for (const match of scriptMatches) {
      const inlineCode = match[1]?.trim() ?? '';
      expect(inlineCode).toBe('');
    }
  });

  it('built shell shows the engine API version from the workspace package', () => {
    const assetsDir = path.join(pagesDist, 'assets');
    const files = fs.readdirSync(assetsDir);
    const jsFiles = files.filter((f) => f.endsWith('.js'));
    expect(jsFiles.length).toBeGreaterThan(0);

    let bundleContent = '';
    for (const jsFile of jsFiles) {
      bundleContent += fs.readFileSync(path.join(assetsDir, jsFile), 'utf8');
    }

    expect(bundleContent).toContain('Engine API version:');
    expect(bundleContent).toContain('Foundation build');
    // ENGINE_API_VERSION = 1
    expect(bundleContent).toMatch(/ENGINE_API_VERSION|id="engine-api-version">1/);
  });

  it('themes gallery page is built for the pages target under the repository base path', () => {
    const themesHtmlPath = path.join(pagesDist, 'themes.html');
    expect(fs.existsSync(themesHtmlPath)).toBe(true);

    const html = fs.readFileSync(themesHtmlPath, 'utf8');
    expect(html).toContain('/arunodaya-solar-events/');
    expect(html).toMatch(/src=["']\/arunodaya-solar-events\/assets\//);
  });

  it('themes gallery page is not part of the android build', () => {
    const themesAndroidPath = path.join(androidDist, 'themes.html');
    expect(fs.existsSync(themesAndroidPath)).toBe(false);
  });

  it('built themes page carries the CSP meta tag and no inline scripts or style attributes', () => {
    const themesHtmlPath = path.join(pagesDist, 'themes.html');
    const html = fs.readFileSync(themesHtmlPath, 'utf8');

    expect(html).toContain('<meta http-equiv="Content-Security-Policy"');
    expect(html).toContain(CSP_POLICY);

    // No inline scripts with executable code
    const scriptMatches = [...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi)];
    for (const match of scriptMatches) {
      const inlineCode = match[1]?.trim() ?? '';
      expect(inlineCode).toBe('');
    }

    // No inline style attributes
    expect(html).not.toMatch(/\sstyle=["'][^"']*["']/i);
  });

  it('built themes page references no remote URLs', () => {
    const themesHtmlPath = path.join(pagesDist, 'themes.html');
    const html = fs.readFileSync(themesHtmlPath, 'utf8');

    // Should not reference remote URLs
    expect(html).not.toMatch(/https?:\/\//i);
    expect(html).not.toMatch(/href=["']\/\//i);
    expect(html).not.toMatch(/src=["']\/\//i);
  });

  it('pages build main bundle stays under 2 KB gzip', () => {
    const assetsDir = path.join(pagesDist, 'assets');
    const files = fs.readdirSync(assetsDir);
    const mainJsFile = files.find(
      (f) => (f.startsWith('index-') || f.startsWith('main-')) && f.endsWith('.js'),
    );
    expect(mainJsFile).toBeDefined();

    const content = fs.readFileSync(path.join(assetsDir, mainJsFile || ''));
    const gzipSize = zlib.gzipSync(content).length;

    // Must stay under 2 KB (2048 bytes)
    expect(gzipSize).toBeLessThanOrEqual(2048);
  });

  it('themes gallery bundle stays under 40 KB gzip', () => {
    const assetsDir = path.join(pagesDist, 'assets');
    const files = fs.readdirSync(assetsDir);
    const themesJsFile = files.find((f) => f.startsWith('themes-') && f.endsWith('.js'));
    expect(themesJsFile).toBeDefined();

    const content = fs.readFileSync(path.join(assetsDir, themesJsFile || ''));
    const gzipSize = zlib.gzipSync(content).length;

    // Must stay under 40 KB (40960 bytes)
    expect(gzipSize).toBeLessThanOrEqual(40960);
  });
});
