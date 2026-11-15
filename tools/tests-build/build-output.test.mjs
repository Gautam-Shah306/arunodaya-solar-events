import fs from 'node:fs';
import path from 'node:path';
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
});
