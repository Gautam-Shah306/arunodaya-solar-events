import { themeCssVariables, type ThemeDefinition } from '@arunodaya/themes';

/**
 * Target DOM element or abstraction supporting CSSOM setProperty and dataset attributes.
 */
export interface ThemeTarget {
  dataset: Record<string, string | undefined>;
  style: {
    setProperty(name: string, value: string): void;
  };
}

/**
 * Applies a theme to a target element by setting dataset.theme and CSS custom properties via CSSOM.
 * Satisfies CSP style-src 'self' by avoiding inline style attribute string manipulation.
 * Calling again replaces previous properties.
 */
export function applyThemeToElement(target: ThemeTarget, theme: ThemeDefinition): void {
  target.dataset.theme = theme.id;
  const vars = themeCssVariables(theme);
  for (const [key, value] of Object.entries(vars)) {
    target.style.setProperty(key, value);
  }
}
