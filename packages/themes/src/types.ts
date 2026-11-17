/**
 * List of all 23 semantic token names supported by the theme system.
 */
export const TOKEN_NAMES = [
  'canvas',
  'layer1',
  'layer2',
  'layer3',
  'border',
  'borderStrong',
  'textPrimary',
  'textSecondary',
  'textTertiary',
  'textOnAccent',
  'accent',
  'accentText',
  'solar',
  'solarText',
  'daySun',
  'nightMoon',
  'countdownFill',
  'countdownShade',
  'focus',
  'positive',
  'warning',
  'critical',
  'scrim',
] as const;

/**
 * Union of all 23 semantic token name strings.
 */
export type SemanticTokenName = (typeof TOKEN_NAMES)[number];

/**
 * List of all 12 widget palette token names.
 */
export const WIDGET_TOKEN_NAMES = [
  'surface',
  'surfaceAlt',
  'border',
  'textPrimary',
  'textSecondary',
  'accent',
  'solar',
  'countdownFill',
  'countdownShade',
  'day',
  'night',
  'stale',
] as const;

/**
 * Union of all 12 widget token name strings.
 */
export type WidgetTokenName = (typeof WIDGET_TOKEN_NAMES)[number];

/**
 * Complete set of semantic tokens mapped to uppercase hex colour strings.
 */
export type SemanticTokens = Record<SemanticTokenName, string>;

/**
 * Complete set of widget palette tokens mapped to uppercase opaque hex colour strings.
 */
export type WidgetPalette = Record<WidgetTokenName, string>;

/**
 * Union of the eight curated theme identifiers.
 */
export type ThemeId =
  | 'light'
  | 'dark'
  | 'pure-dark'
  | 'darker'
  | 'pack-navy'
  | 'pack-burgundy'
  | 'pack-porcelain'
  | 'pack-sandstone';

/**
 * Classification family for themes.
 */
export type ThemeFamily = 'built_in' | 'pack';

/**
 * Base luminance mode for theme styling and system mapping.
 */
export type BaseMode = 'light' | 'dark';

/**
 * Immutable definition of a curated theme.
 */
export interface ThemeDefinition {
  /** Unique kebab-case theme identifier */
  readonly id: ThemeId;
  /** Human-readable display name */
  readonly name: string;
  /** Built-in or custom theme pack family */
  readonly family: ThemeFamily;
  /** Base light or dark mode */
  readonly baseMode: BaseMode;
  /** 23 semantic tokens */
  readonly tokens: SemanticTokens;
  /** 12 widget palette tokens */
  readonly widget: WidgetPalette;
}

/**
 * User theme selection choice: either match the system mode or lock to a specific theme.
 */
export type ThemeChoice =
  { readonly kind: 'system' } | { readonly kind: 'theme'; readonly id: ThemeId };
