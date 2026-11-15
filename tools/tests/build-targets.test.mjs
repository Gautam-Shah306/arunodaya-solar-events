import { describe, expect, it } from 'vitest';
import { resolveBase, REPO_BASE_PATH } from '../lib/build-targets.mjs';

describe('build-targets', () => {
  it('resolveBase returns the GitHub Pages base for target pages', () => {
    expect(resolveBase('pages')).toBe(REPO_BASE_PATH);
    expect(resolveBase('pages')).toBe('/arunodaya-solar-events/');
  });

  it('resolveBase returns dot slash for target android', () => {
    expect(resolveBase('android')).toBe('./');
  });

  it('resolveBase returns slash for dev', () => {
    expect(resolveBase('dev')).toBe('/');
  });

  it('resolveBase rejects an unknown target', () => {
    // @ts-expect-error Testing invalid target input
    expect(() => resolveBase('ios')).toThrow(/Unknown build target/);
  });
});
