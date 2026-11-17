import { describe, expect, it } from 'vitest';
import * as rootEntry from '../src/index.js';
import * as astroEntry from '../src/astro/index.js';

describe('Engine Entry Points', () => {
  it('engine root entry does not export astronomy provider symbols', () => {
    const rootExports = Object.keys(rootEntry);
    expect(rootExports).not.toContain('buildSnapshot');
    expect(rootExports).not.toContain('computeAstroDay');
    expect(rootExports).not.toContain('computeDayRecord');
    expect(rootExports).not.toContain('computeMoonEvents');
    expect(rootExports).not.toContain('ASTRONOMY_ENGINE');
    expect(rootExports).not.toContain('accuracyTier');
    expect(rootExports).toContain('planSnapshotWindow');
  });

  it('engine astro entry exports the provider and snapshot builder', () => {
    const astroExports = Object.keys(astroEntry);
    expect(astroExports).toContain('buildSnapshot');
    expect(astroExports).toContain('computeAstroDay');
    expect(astroExports).toContain('computeDayRecord');
    expect(astroExports).toContain('computeMoonEvents');
    expect(astroExports).toContain('ASTRONOMY_ENGINE');
    expect(astroExports).toContain('accuracyTier');
    expect(astroExports).toContain('planSnapshotWindow');
  });
});
