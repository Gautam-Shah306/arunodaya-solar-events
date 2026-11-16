import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  resolveBase,
  resolveHtmlInputs,
  isDebugBuild,
  REPO_BASE_PATH,
} from '../lib/build-targets.mjs';

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

  it('isDebugBuild is true for pages and dev and false for android', () => {
    expect(isDebugBuild('pages')).toBe(true);
    expect(isDebugBuild('dev')).toBe(true);
    expect(isDebugBuild('android')).toBe(false);
    // @ts-expect-error test invalid target
    expect(() => isDebugBuild('unknown')).toThrow(/Unknown build target/);
  });

  it('resolveHtmlInputs includes the components page for pages and dev only', () => {
    const root = '/mock/app';
    const pagesInputs = resolveHtmlInputs('pages', root);
    expect(pagesInputs.components).toBe(path.join(root, 'components.html'));

    const devInputs = resolveHtmlInputs('dev', root);
    expect(devInputs.components).toBe(path.join(root, 'components.html'));

    const androidInputs = resolveHtmlInputs('android', root);
    expect(androidInputs.components).toBeUndefined();
  });

  it('resolveHtmlInputs includes the themes page for the pages target', () => {
    const root = '/mock/app';
    const inputs = resolveHtmlInputs('pages', root);
    expect(inputs).toEqual({
      main: path.join(root, 'index.html'),
      themes: path.join(root, 'themes.html'),
      components: path.join(root, 'components.html'),
    });
  });

  it('resolveHtmlInputs includes the themes page for the dev target', () => {
    const root = '/mock/app';
    const inputs = resolveHtmlInputs('dev', root);
    expect(inputs).toEqual({
      main: path.join(root, 'index.html'),
      themes: path.join(root, 'themes.html'),
      components: path.join(root, 'components.html'),
    });
  });

  it('resolveHtmlInputs excludes the themes page for the android target', () => {
    const root = '/mock/app';
    const inputs = resolveHtmlInputs('android', root);
    expect(inputs).toEqual({
      main: path.join(root, 'index.html'),
    });
    expect(inputs.themes).toBeUndefined();
    expect(inputs.components).toBeUndefined();

    // @ts-expect-error test invalid target
    expect(() => resolveHtmlInputs('unknown', root)).toThrow(/Unknown build target/);
  });
});
