import { describe, expect, it } from 'vitest';
import { litAreaFraction, moonGlyphGeometry, moonGlyphPath } from '../src/home/moon-glyph.js';

describe('Moon Glyph Geometry and SVG Path', () => {
  it('moon glyph geometry lights nothing at new moon and everything at full moon', () => {
    const newMoon = moonGlyphGeometry(0);
    expect(newMoon.illumination).toBeCloseTo(0, 5);
    const newPath = moonGlyphPath(newMoon, 24, 24, 20);
    expect(newPath).toBe('');

    const fullMoon = moonGlyphGeometry(0.5);
    expect(fullMoon.illumination).toBeCloseTo(1.0, 5);
    const fullPath = moonGlyphPath(fullMoon, 24, 24, 20);
    expect(fullPath).toContain('M 24 4');
    expect(fullPath).toContain('A 20 20 0 1 1');
  });

  it('moon glyph geometry lights the right half at first quarter and the left half at last quarter', () => {
    const firstQuarter = moonGlyphGeometry(0.25);
    expect(firstQuarter.illumination).toBeCloseTo(0.5, 5);
    expect(firstQuarter.isWaxing).toBe(true);
    expect(firstQuarter.ratio).toBeCloseTo(0, 5);

    const thirdQuarter = moonGlyphGeometry(0.75);
    expect(thirdQuarter.illumination).toBeCloseTo(0.5, 5);
    expect(thirdQuarter.isWaxing).toBe(false);
    expect(thirdQuarter.ratio).toBeCloseTo(0, 5);
  });

  it('moon glyph geometry lights the right side while waxing and the left side while waning', () => {
    const waxing = moonGlyphGeometry(0.125);
    expect(waxing.isWaxing).toBe(true);

    const waning = moonGlyphGeometry(0.875);
    expect(waning.isWaxing).toBe(false);
  });

  it('moon glyph lit area fraction equals the illumination formula for every phase', () => {
    for (let i = 0; i <= 20; i++) {
      const frac = i / 20;
      const geom = moonGlyphGeometry(frac);
      expect(litAreaFraction(geom)).toBeCloseTo(geom.illumination, 5);
      const expectedIllum = 0.5 * (1 - Math.cos(2 * Math.PI * frac));
      expect(geom.illumination).toBeCloseTo(expectedIllum, 5);
    }
  });

  it('moon glyph path is a closed svg path for crescent gibbous and half phases', () => {
    const phases = [0.125, 0.25, 0.375, 0.625, 0.75, 0.875];
    for (const phase of phases) {
      const geom = moonGlyphGeometry(phase);
      const path = moonGlyphPath(geom, 50, 50, 40);
      expect(path.startsWith('M 50 10')).toBe(true);
      expect(path.endsWith('Z')).toBe(true);
    }
  });
});
