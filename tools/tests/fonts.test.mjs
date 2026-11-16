import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { readWoff2 } from '../lib/woff2-features.mjs';

const fontsDir = path.resolve('apps/app/src/assets/fonts');
const fontsCssPath = path.resolve('apps/app/src/styles/fonts.css');
const baseCssPath = path.resolve('apps/app/src/styles/base.css');
const docsFontsPath = path.resolve('docs/FONTS.md');

function getCommittedFontFiles() {
  if (!fs.existsSync(fontsDir)) return [];
  return fs.readdirSync(fontsDir).filter((f) => f.endsWith('.woff2'));
}

describe('Bundled Fonts and Typography Invariants', () => {
  it('woff2 reader rejects data without the wOF2 signature', () => {
    const invalidBuffer = Buffer.from('NOT_A_WOFF2_HEADER_DATA_123456789012345678901234567890');
    const res = readWoff2(invalidBuffer);
    expect(res).toHaveProperty('error');
    if ('error' in res) {
      expect(res.error).toMatch(/signature/i);
    }

    expect(readWoff2(null)).toHaveProperty('error');
    expect(readWoff2(123)).toHaveProperty('error');
    expect(readWoff2(Buffer.alloc(20))).toHaveProperty('error');
  });

  it('woff2 reader lists the table tags of every committed font', () => {
    const fontFiles = getCommittedFontFiles();
    expect(fontFiles.length).toBeGreaterThan(0);

    for (const file of fontFiles) {
      const buffer = fs.readFileSync(path.join(fontsDir, file));
      const res = readWoff2(buffer);
      expect('error' in res).toBe(false);
      if ('tables' in res) {
        expect(Array.isArray(res.tables)).toBe(true);
        expect(res.tables).toContain('cmap');
        expect(res.tables).toContain('head');
        expect(res.tables).toContain('OS/2');
        expect(res.tables).toContain('GSUB');
      }
    }
  });

  it('woff2 reader finds lnum and tnum in every committed font', () => {
    const fontFiles = getCommittedFontFiles();
    expect(fontFiles.length).toBeGreaterThan(0);

    for (const file of fontFiles) {
      const buffer = fs.readFileSync(path.join(fontsDir, file));
      const res = readWoff2(buffer);
      expect('error' in res).toBe(false);
      if ('gsubFeatures' in res && res.gsubFeatures) {
        expect(res.gsubFeatures, `Expected ${file} to contain lnum feature`).toContain('lnum');
        expect(res.gsubFeatures, `Expected ${file} to contain tnum feature`).toContain('tnum');
      }
    }
  });

  it('committed font files are woff2 and each below 200 KB', () => {
    const fontFiles = getCommittedFontFiles();
    expect(fontFiles.length).toBeGreaterThan(0);

    for (const file of fontFiles) {
      const filePath = path.join(fontsDir, file);
      const stat = fs.statSync(filePath);
      expect(stat.size).toBeLessThan(200 * 1024);
      expect(file.endsWith('.woff2')).toBe(true);

      const header = Buffer.alloc(4);
      const fd = fs.openSync(filePath, 'r');
      fs.readSync(fd, header, 0, 4, 0);
      fs.closeSync(fd);
      expect(header.toString('latin1')).toBe('wOF2');
    }
  });

  it('docs FONTS lists the sha256 of every committed font file', () => {
    const fontFiles = getCommittedFontFiles();
    expect(fontFiles.length).toBeGreaterThan(0);
    const docsFontsContent = fs.readFileSync(docsFontsPath, 'utf8');

    for (const file of fontFiles) {
      const buffer = fs.readFileSync(path.join(fontsDir, file));
      const sha256 = crypto.createHash('sha256').update(buffer).digest('hex');
      expect(
        docsFontsContent.toLowerCase(),
        `Expected docs/FONTS.md to contain sha256 ${sha256} for ${file}`,
      ).toContain(sha256.toLowerCase());
    }
  });

  it('font stylesheet declares bundled woff2 sources with font-display swap and no remote URLs', () => {
    const css = fs.readFileSync(fontsCssPath, 'utf8');
    expect(css).toContain('@font-face');
    expect(css).toContain('font-display: swap');
    expect(css).toMatch(/url\(['"].*?\.woff2['"]\)/);
    expect(css).not.toMatch(/https?:\/\//i);
  });

  it('stylesheets contain no Georgia', () => {
    const stylesDir = path.resolve('apps/app/src/styles');
    const cssFiles = fs.readdirSync(stylesDir).filter((f) => f.endsWith('.css'));
    expect(cssFiles.length).toBeGreaterThan(0);

    for (const file of cssFiles) {
      const content = fs.readFileSync(path.join(stylesDir, file), 'utf8');
      expect(content).not.toMatch(/\bGeorgia\b/i);
    }
  });

  it('numeric text rules use lining and tabular figures', () => {
    const baseCss = fs.readFileSync(baseCssPath, 'utf8');
    const normalized = baseCss.replace(/\s+/g, ' ');
    expect(normalized).toContain('.ar-num');
    expect(normalized).toContain('font-variant-numeric: lining-nums tabular-nums');
    expect(normalized).toContain("font-feature-settings: 'lnum' 1, 'tnum' 1");
  });
});
