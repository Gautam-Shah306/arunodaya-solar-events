import { themeLight } from './themes/light.js';
import { themeDark } from './themes/dark.js';
import { themePureDark } from './themes/pure-dark.js';
import { themeDarker } from './themes/darker.js';
import { themePackNavy } from './themes/pack-navy.js';
import { themePackBurgundy } from './themes/pack-burgundy.js';
import { themePackAubergine } from './themes/pack-aubergine.js';
import { themePackMidnightTeal } from './themes/pack-midnight-teal.js';
import { themePackPorcelain } from './themes/pack-porcelain.js';
import { themePackSandstone } from './themes/pack-sandstone.js';
import type { ThemeChoice, ThemeDefinition, ThemeId } from './types.js';

/**
 * Ordered list of all 10 curated theme definitions.
 */
export const THEMES: readonly ThemeDefinition[] = [
  themeLight,
  themeDark,
  themePureDark,
  themeDarker,
  themePackNavy,
  themePackBurgundy,
  themePackAubergine,
  themePackMidnightTeal,
  themePackPorcelain,
  themePackSandstone,
] as const;

/**
 * Ordered array of all 10 curated theme identifiers.
 */
export const THEME_IDS: readonly ThemeId[] = [
  'light',
  'dark',
  'pure-dark',
  'darker',
  'pack-navy',
  'pack-burgundy',
  'pack-aubergine',
  'pack-midnight-teal',
  'pack-porcelain',
  'pack-sandstone',
] as const;

const THEMES_BY_ID = new Map<string, ThemeDefinition>(THEMES.map((t) => [t.id, t]));
const THEME_IDS_SET = new Set<string>(THEME_IDS);

/**
 * Fallback theme identifier when system prefers light mode.
 */
export const SYSTEM_LIGHT_THEME_ID: ThemeId = 'light';

/**
 * Fallback theme identifier when system prefers dark mode.
 */
export const SYSTEM_DARK_THEME_ID: ThemeId = 'pure-dark';

/**
 * Default user theme choice (Match system).
 */
export const DEFAULT_THEME_CHOICE: ThemeChoice = { kind: 'system' } as const;

/**
 * Type guard verifying whether an arbitrary value is a recognized ThemeId.
 */
export function isThemeId(value: unknown): value is ThemeId {
  return typeof value === 'string' && THEME_IDS_SET.has(value);
}

/**
 * Retrieves a theme definition by identifier, or undefined if unknown.
 */
export function getTheme(id: string): ThemeDefinition | undefined {
  return THEMES_BY_ID.get(id);
}

function getSystemTheme(systemIsDark: boolean): ThemeDefinition {
  return systemIsDark ? themePureDark : themeLight;
}

/**
 * Resolves a ThemeChoice against the current system darkness preference.
 * Match system maps only to light and pure-dark.
 */
export function resolveTheme(choice: ThemeChoice, systemIsDark: boolean): ThemeDefinition {
  if (choice.kind === 'system') {
    return getSystemTheme(systemIsDark);
  }

  const explicitTheme = THEMES_BY_ID.get(choice.id);
  if (explicitTheme) {
    return explicitTheme;
  }

  // Fallback to system mapping if explicit theme ID is unknown
  return getSystemTheme(systemIsDark);
}

/**
 * Parses an arbitrary input into a valid ThemeChoice.
 * Accepts strings ('system', 'theme:<id>', or bare '<id>') or objects ({ kind: 'system' } | { kind: 'theme', id }).
 * Never throws; returns DEFAULT_THEME_CHOICE on unknown IDs or malformed input.
 */
export function parseThemeChoice(raw: unknown): ThemeChoice {
  if (typeof raw === 'string') {
    if (raw === 'system') {
      return { kind: 'system' };
    }
    if (raw.startsWith('theme:')) {
      const id = raw.slice(6);
      if (isThemeId(id)) {
        return { kind: 'theme', id };
      }
      return { kind: 'system' };
    }
    if (isThemeId(raw)) {
      return { kind: 'theme', id: raw };
    }
    return { kind: 'system' };
  }

  if (raw && typeof raw === 'object') {
    const obj = raw as Record<string, unknown>;
    if (obj.kind === 'system') {
      return { kind: 'system' };
    }
    if (obj.kind === 'theme' && isThemeId(obj.id)) {
      return { kind: 'theme', id: obj.id };
    }
  }

  return { kind: 'system' };
}

/**
 * Serializes a ThemeChoice into a canonical string ('system' or 'theme:<id>').
 */
export function serializeThemeChoice(choice: ThemeChoice): string {
  if (choice.kind === 'system') {
    return 'system';
  }
  return `theme:${choice.id}`;
}
