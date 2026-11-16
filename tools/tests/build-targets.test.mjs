import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { resolveBase, resolveHtmlInputs, REPO_BASE_PATH } from '../lib/build-targets.mjs';

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

  it('resolveHtmlInputs includes the themes page for the pages target', () => {
    const root = '/mock/app';
    const inputs = resolveHtmlInputs('pages', root);
    expect(inputs).toEqual({
      main: path.join(root, 'index.html'),
      themes: path.join(root, 'themes.html'),
    });
  });

  it('resolveHtmlInputs includes the themes page for the dev target', () => {
    const root = '/mock/app';
    const inputs = resolveHtmlInputs('dev', root);
    expect(inputs).toEqual({
      main: path.join(root, 'index.html'),
      themes: path.join(root, 'themes.html'),
    });
  });

  it('resolveHtmlInputs excludes the themes page for the android target', () => {
    const root = '/mock/app';
    const inputs = resolveHtmlInputs('android', root);
    expect(inputs).toEqual({
      main: path.join(root, 'index.html'),
    });
    expect(inputs.themes).toBeUndefined();

    // @ts-expect-error test invalid target
    expect(() => resolveHtmlInputs('unknown', root)).toThrow(/Unknown build target/);
  });
});
