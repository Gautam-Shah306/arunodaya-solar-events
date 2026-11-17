import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { readWoff2 } from '../lib/woff2-features.mjs';

const fontsDir = path.resolve('apps/app/src/assets/fonts');
const fontsCssPath = path.resolve('apps/app/src/styles/fonts.css');
const baseCssPath = path.resolve('apps/app/src/styles/base.css');

function getCommittedFontFiles() {
  if (!fs.existsSync(fontsDir)) return [];
  return fs.readdirSync(fontsDir).filter((f) => f.endsWith('.woff2'));
}

describe('Bundled Fonts and Typography Invariants', () => {
  it('font assets directory contains only Playfair Display and Inter fonts', () => {
    const files = getCommittedFontFiles();
    expect(files.length).toBeGreaterThan(0);
    for (const file of files) {
      const allowed = file.startsWith('playfair-display') || file.startsWith('inter');
      expect(allowed, `Unexpected font file in bundle: ${file}`).toBe(true);
    }
  });

  it('Gelasio font files and license are absent', () => {
    const allFiles = fs.readdirSync(fontsDir);
    for (const file of allFiles) {
      expect(file.toLowerCase()).not.toContain('gelasio');
    }
  });

  it('Playfair Display WOFF2 files exist with OFL license', () => {
    const files = fs.readdirSync(fontsDir);
    expect(files).toContain('playfair-display-latin-400-normal.woff2');
    expect(files).toContain('playfair-display-latin-700-normal.woff2');
    expect(files).toContain('LICENSE-playfair-display.txt');

    const licenseContent = fs.readFileSync(
      path.join(fontsDir, 'LICENSE-playfair-display.txt'),
      'utf8',
    );
    expect(licenseContent).toContain('SIL OPEN FONT LICENSE Version 1.1');
  });

  it('Playfair Display WOFF2 contains lining figures feature lnum', () => {
    const fontFiles = getCommittedFontFiles().filter((f) => f.startsWith('playfair-display'));
    expect(fontFiles.length).toBeGreaterThanOrEqual(2);

    for (const file of fontFiles) {
      const buffer = fs.readFileSync(path.join(fontsDir, file));
      const res = readWoff2(buffer);
      expect('error' in res).toBe(false);
      expect(res.gsubFeatures, `Expected ${file} to contain lnum feature`).toContain('lnum');
    }
  });

  it('Playfair Display font face declarations use swap display', () => {
    const css = fs.readFileSync(fontsCssPath, 'utf8');
    expect(css).toContain("font-family: 'Playfair Display'");
    expect(css).toContain('font-display: swap');
    expect(css).toContain("local('Playfair Display')");
    expect(css).toContain('unicode-range:');
  });

  it('serif font stack prioritizes Playfair Display', () => {
    const baseCss = fs.readFileSync(baseCssPath, 'utf8');
    expect(baseCss).toMatch(/--ar-font-serif:\s*'Playfair Display'/);
  });

  it('digit width CSS variable is calibrated for Playfair Display', () => {
    const baseCss = fs.readFileSync(baseCssPath, 'utf8');
    expect(baseCss).toMatch(/--ar-digit-width:\s*[\d.]+(?:ch|em|px)/);
  });

  it('font files stay within individual budget', () => {
    const fontFiles = getCommittedFontFiles();
    expect(fontFiles.length).toBeGreaterThan(0);

    for (const file of fontFiles) {
      const filePath = path.join(fontsDir, file);
      const stat = fs.statSync(filePath);
      // Playfair Display Latin subsets are ~22-24 KB, well below 50 KB individual budget
      expect(stat.size).toBeLessThan(50 * 1024);
    }
  });

  it('all bundled font files have valid WOFF2 headers', () => {
    const fontFiles = getCommittedFontFiles();
    expect(fontFiles.length).toBeGreaterThan(0);

    for (const file of fontFiles) {
      const filePath = path.join(fontsDir, file);
      const header = Buffer.alloc(4);
      const fd = fs.openSync(filePath, 'r');
      fs.readSync(fd, header, 0, 4, 0);
      fs.closeSync(fd);
      expect(header.toString('latin1')).toBe('wOF2');
    }
  });
});
