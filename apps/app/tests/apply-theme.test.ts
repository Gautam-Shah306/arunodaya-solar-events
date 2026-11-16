import { describe, expect, it } from 'vitest';
import { getTheme, TOKEN_NAMES, type ThemeDefinition } from '@arunodaya/themes';
import { applyThemeToElement, type ThemeTarget } from '../src/theme/apply-theme.js';

function requireTheme(id: string): ThemeDefinition {
  const theme = getTheme(id);
  if (!theme) {
    throw new Error(`Theme not found: ${id}`);
  }
  return theme;
}

const lightTheme = requireTheme('light');
const darkTheme = requireTheme('pure-dark');

describe('applyThemeToElement', () => {
  it('applyThemeToElement sets every token as a custom property on the element', () => {
    const props: Record<string, string> = {};
    const target: ThemeTarget = {
      dataset: {},
      style: {
        setProperty(name: string, value: string) {
          props[name] = value;
        },
      },
    };

    applyThemeToElement(target, lightTheme);

    for (const token of TOKEN_NAMES) {
      const kebab = token.replace(/([a-z])([A-Z0-9])/g, '$1-$2').toLowerCase();
      expect(props[`--ar-${kebab}`]).toBe(lightTheme.tokens[token]);
    }
    expect(props['--ar-canvas']).toBe(lightTheme.tokens.canvas);
    expect(props['--ar-layer-1']).toBe(lightTheme.tokens.layer1);
  });

  it('applyThemeToElement sets data-theme and color-scheme', () => {
    const props: Record<string, string> = {};
    const target: ThemeTarget = {
      dataset: {},
      style: {
        setProperty(name: string, value: string) {
          props[name] = value;
        },
      },
    };

    applyThemeToElement(target, lightTheme);
    expect(target.dataset.theme).toBe('light');
    expect(props['color-scheme']).toBe('light');

    applyThemeToElement(target, darkTheme);
    expect(target.dataset.theme).toBe('pure-dark');
    expect(props['color-scheme']).toBe('dark');
  });

  it('applyThemeToElement replaces the previous theme values', () => {
    const props: Record<string, string> = {};
    const target: ThemeTarget = {
      dataset: {},
      style: {
        setProperty(name: string, value: string) {
          props[name] = value;
        },
      },
    };

    applyThemeToElement(target, lightTheme);
    expect(props['--ar-canvas']).toBe(lightTheme.tokens.canvas);
    expect(target.dataset.theme).toBe('light');

    applyThemeToElement(target, darkTheme);
    expect(props['--ar-canvas']).toBe(darkTheme.tokens.canvas);
    expect(target.dataset.theme).toBe('pure-dark');
  });
});
