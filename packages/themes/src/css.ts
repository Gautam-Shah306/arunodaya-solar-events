import type { ThemeDefinition } from './types.js';

/**
 * Converts camelCase and alphanumeric token names to kebab-case with digits hyphenated.
 * Examples: layer1 -> layer-1, borderStrong -> border-strong, textOnAccent -> text-on-accent.
 */
export function tokenNameToKebab(name: string): string {
  return name.replace(/([a-z])([A-Z0-9])/g, '$1-$2').toLowerCase();
}

/**
 * Generates the full dictionary of CSS custom properties for a theme.
 * Formats:
 * - Semantic tokens: --ar-<kebab>
 * - Widget tokens: --ar-widget-<kebab>
 * - color-scheme: 'light' | 'dark'
 */
export function themeCssVariables(theme: ThemeDefinition): Record<string, string> {
  const vars: Record<string, string> = {};

  // Semantic tokens
  for (const [key, value] of Object.entries(theme.tokens)) {
    const kebab = tokenNameToKebab(key);
    vars[`--ar-${kebab}`] = value;
  }

  // Widget tokens
  for (const [key, value] of Object.entries(theme.widget)) {
    const kebab = tokenNameToKebab(key);
    vars[`--ar-widget-${kebab}`] = value;
  }

  // CSS color-scheme
  vars['color-scheme'] = theme.baseMode;

  return vars;
}

/**
 * Returns the theme canvas colour suitable for HTML <meta name="theme-color"> tags.
 */
export function themeColorForMeta(theme: ThemeDefinition): string {
  return theme.tokens.canvas;
}
