import type { SemanticTokenName, WidgetTokenName } from './types.js';

/**
 * Scope of a contrast evaluation check: either application semantic tokens or widget palette.
 */
export type ContrastScope = 'tokens' | 'widget';

/**
 * Definition of a required contrast validation rule.
 */
export interface ContrastCheck<
  TKey extends SemanticTokenName | WidgetTokenName = SemanticTokenName | WidgetTokenName,
> {
  /** Unique kebab-case check identifier */
  readonly id: string;
  /** Foreground token key */
  readonly fg: TKey;
  /** Background token key */
  readonly bg: TKey;
  /** Scope target: tokens or widget */
  readonly scope: ContrastScope;
  /** Required minimum WCAG contrast ratio (Proposed thresholds) */
  readonly min: number;
  /** Purpose and semantic context of this check */
  readonly purpose: string;
}

/**
 * Complete list of all 45 automated contrast checks across semantic tokens and widget palettes.
 * Minimum contrast ratio thresholds are Proposed in the specification and guarded here.
 */
export const CONTRAST_CHECKS: readonly (
  ContrastCheck<SemanticTokenName> | ContrastCheck<WidgetTokenName>
)[] = [
  // --- Semantic Tokens Scope (33 checks) ---
  {
    id: 'text-primary-canvas',
    fg: 'textPrimary',
    bg: 'canvas',
    scope: 'tokens',
    min: 7,
    purpose: 'Primary text readability on canvas (WCAG AAA level)',
  },
  {
    id: 'text-primary-layer1',
    fg: 'textPrimary',
    bg: 'layer1',
    scope: 'tokens',
    min: 7,
    purpose: 'Primary text readability on layer 1 cards (WCAG AAA level)',
  },
  {
    id: 'text-primary-layer2',
    fg: 'textPrimary',
    bg: 'layer2',
    scope: 'tokens',
    min: 4.5,
    purpose: 'Primary text readability on layer 2 surfaces (WCAG AA level)',
  },
  {
    id: 'text-primary-layer3',
    fg: 'textPrimary',
    bg: 'layer3',
    scope: 'tokens',
    min: 4.5,
    purpose: 'Primary text readability on layer 3 surfaces (WCAG AA level)',
  },
  {
    id: 'text-secondary-canvas',
    fg: 'textSecondary',
    bg: 'canvas',
    scope: 'tokens',
    min: 4.5,
    purpose: 'Secondary text readability on canvas (WCAG AA level)',
  },
  {
    id: 'text-secondary-layer1',
    fg: 'textSecondary',
    bg: 'layer1',
    scope: 'tokens',
    min: 4.5,
    purpose: 'Secondary text readability on layer 1 cards (WCAG AA level)',
  },
  {
    id: 'text-secondary-layer2',
    fg: 'textSecondary',
    bg: 'layer2',
    scope: 'tokens',
    min: 4.5,
    purpose: 'Secondary text readability on layer 2 surfaces (WCAG AA level)',
  },
  {
    id: 'text-secondary-layer3',
    fg: 'textSecondary',
    bg: 'layer3',
    scope: 'tokens',
    min: 4.5,
    purpose: 'Secondary text readability on layer 3 surfaces (WCAG AA level)',
  },
  {
    id: 'text-tertiary-canvas',
    fg: 'textTertiary',
    bg: 'canvas',
    scope: 'tokens',
    min: 3,
    purpose: 'Tertiary text readability on canvas (large or non-essential text only)',
  },
  {
    id: 'text-tertiary-layer1',
    fg: 'textTertiary',
    bg: 'layer1',
    scope: 'tokens',
    min: 3,
    purpose: 'Tertiary text readability on layer 1 cards (large or non-essential text only)',
  },
  {
    id: 'accent-text-canvas',
    fg: 'accentText',
    bg: 'canvas',
    scope: 'tokens',
    min: 4.5,
    purpose: 'Accent text readability on canvas',
  },
  {
    id: 'accent-text-layer1',
    fg: 'accentText',
    bg: 'layer1',
    scope: 'tokens',
    min: 4.5,
    purpose: 'Accent text readability on layer 1 cards',
  },
  {
    id: 'solar-text-canvas',
    fg: 'solarText',
    bg: 'canvas',
    scope: 'tokens',
    min: 4.5,
    purpose: 'Solar text readability on canvas',
  },
  {
    id: 'solar-text-layer1',
    fg: 'solarText',
    bg: 'layer1',
    scope: 'tokens',
    min: 4.5,
    purpose: 'Solar text readability on layer 1 cards',
  },
  {
    id: 'text-on-accent-accent',
    fg: 'textOnAccent',
    bg: 'accent',
    scope: 'tokens',
    min: 4.5,
    purpose: 'Text readability on accent-filled interactive controls',
  },
  {
    id: 'accent-canvas',
    fg: 'accent',
    bg: 'canvas',
    scope: 'tokens',
    min: 3,
    purpose: 'Accent component and icon visibility against canvas',
  },
  {
    id: 'solar-canvas',
    fg: 'solar',
    bg: 'canvas',
    scope: 'tokens',
    min: 3,
    purpose: 'Solar accent visibility against canvas',
  },
  {
    id: 'border-strong-canvas',
    fg: 'borderStrong',
    bg: 'canvas',
    scope: 'tokens',
    min: 3,
    purpose: 'Strong border and divider visibility against canvas',
  },
  {
    id: 'border-strong-layer1',
    fg: 'borderStrong',
    bg: 'layer1',
    scope: 'tokens',
    min: 3,
    purpose: 'Strong border and divider visibility against layer 1',
  },
  {
    id: 'focus-canvas',
    fg: 'focus',
    bg: 'canvas',
    scope: 'tokens',
    min: 3,
    purpose: 'Focus outline visibility against canvas',
  },
  {
    id: 'focus-layer1',
    fg: 'focus',
    bg: 'layer1',
    scope: 'tokens',
    min: 3,
    purpose: 'Focus outline visibility against layer 1',
  },
  {
    id: 'focus-layer2',
    fg: 'focus',
    bg: 'layer2',
    scope: 'tokens',
    min: 3,
    purpose: 'Focus outline visibility against layer 2',
  },
  {
    id: 'day-sun-layer1',
    fg: 'daySun',
    bg: 'layer1',
    scope: 'tokens',
    min: 3,
    purpose: 'Day sun icon visibility against layer 1 card background',
  },
  {
    id: 'night-moon-layer1',
    fg: 'nightMoon',
    bg: 'layer1',
    scope: 'tokens',
    min: 3,
    purpose: 'Night moon icon visibility against layer 1 card background',
  },
  {
    id: 'countdown-fill-layer1',
    fg: 'countdownFill',
    bg: 'layer1',
    scope: 'tokens',
    min: 7,
    purpose: 'Countdown fill prominence on layer 1',
  },
  {
    id: 'countdown-shade-layer1',
    fg: 'countdownShade',
    bg: 'layer1',
    scope: 'tokens',
    min: 3,
    purpose: 'Countdown track shade visibility on layer 1',
  },
  {
    id: 'countdown-fill-vs-shade',
    fg: 'countdownFill',
    bg: 'countdownShade',
    scope: 'tokens',
    min: 1.8,
    purpose: 'Countdown progress fill perceptible separation from track shade',
  },
  {
    id: 'positive-canvas',
    fg: 'positive',
    bg: 'canvas',
    scope: 'tokens',
    min: 4.5,
    purpose: 'Positive status indicator readability on canvas',
  },
  {
    id: 'positive-layer1',
    fg: 'positive',
    bg: 'layer1',
    scope: 'tokens',
    min: 4.5,
    purpose: 'Positive status indicator readability on layer 1 cards',
  },
  {
    id: 'warning-canvas',
    fg: 'warning',
    bg: 'canvas',
    scope: 'tokens',
    min: 4.5,
    purpose: 'Warning status indicator readability on canvas',
  },
  {
    id: 'warning-layer1',
    fg: 'warning',
    bg: 'layer1',
    scope: 'tokens',
    min: 4.5,
    purpose: 'Warning status indicator readability on layer 1 cards',
  },
  {
    id: 'critical-canvas',
    fg: 'critical',
    bg: 'canvas',
    scope: 'tokens',
    min: 4.5,
    purpose: 'Critical status indicator readability on canvas',
  },
  {
    id: 'critical-layer1',
    fg: 'critical',
    bg: 'layer1',
    scope: 'tokens',
    min: 4.5,
    purpose: 'Critical status indicator readability on layer 1 cards',
  },

  // --- Widget Palette Scope (12 checks) ---
  {
    id: 'widget-text-primary-surface',
    fg: 'textPrimary',
    bg: 'surface',
    scope: 'widget',
    min: 7,
    purpose: 'Widget primary text readability on base surface',
  },
  {
    id: 'widget-text-primary-surface-alt',
    fg: 'textPrimary',
    bg: 'surfaceAlt',
    scope: 'widget',
    min: 4.5,
    purpose: 'Widget primary text readability on alternate surface',
  },
  {
    id: 'widget-text-secondary-surface',
    fg: 'textSecondary',
    bg: 'surface',
    scope: 'widget',
    min: 4.5,
    purpose: 'Widget secondary text readability on base surface',
  },
  {
    id: 'widget-text-secondary-surface-alt',
    fg: 'textSecondary',
    bg: 'surfaceAlt',
    scope: 'widget',
    min: 4.5,
    purpose: 'Widget secondary text readability on alternate surface',
  },
  {
    id: 'widget-accent-surface',
    fg: 'accent',
    bg: 'surface',
    scope: 'widget',
    min: 3,
    purpose: 'Widget accent element visibility on surface',
  },
  {
    id: 'widget-solar-surface',
    fg: 'solar',
    bg: 'surface',
    scope: 'widget',
    min: 4.5,
    purpose: 'Widget solar accent readability on surface',
  },
  {
    id: 'widget-countdown-fill-surface',
    fg: 'countdownFill',
    bg: 'surface',
    scope: 'widget',
    min: 7,
    purpose: 'Widget countdown fill prominence on surface',
  },
  {
    id: 'widget-countdown-shade-surface',
    fg: 'countdownShade',
    bg: 'surface',
    scope: 'widget',
    min: 3,
    purpose: 'Widget countdown track shade visibility on surface',
  },
  {
    id: 'widget-fill-vs-shade',
    fg: 'countdownFill',
    bg: 'countdownShade',
    scope: 'widget',
    min: 1.8,
    purpose: 'Widget countdown fill perceptible separation from shade',
  },
  {
    id: 'widget-day-surface',
    fg: 'day',
    bg: 'surface',
    scope: 'widget',
    min: 3,
    purpose: 'Widget day status indicator visibility on surface',
  },
  {
    id: 'widget-night-surface',
    fg: 'night',
    bg: 'surface',
    scope: 'widget',
    min: 3,
    purpose: 'Widget night status indicator visibility on surface',
  },
  {
    id: 'widget-stale-surface',
    fg: 'stale',
    bg: 'surface',
    scope: 'widget',
    min: 4.5,
    purpose: 'Widget stale marker readability on surface',
  },
] as const;
