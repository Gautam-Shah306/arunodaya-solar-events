import {
  parseThemeChoice,
  resolveTheme,
  serializeThemeChoice,
  themeColorForMeta,
  type ThemeChoice,
  type ThemeDefinition,
  type ThemeId,
} from '@arunodaya/themes';
import { applyThemeToElement, type ThemeTarget } from '../theme/apply-theme.js';
import { loadPrefs, savePrefs } from './prefs.js';
import type { KeyValueStore } from './storage.js';

export const EARLY_PAINT_CANVAS_KEY = 'arunodaya.theme.canvas';
export const EARLY_PAINT_MODE_KEY = 'arunodaya.theme.mode';

/**
 * Abstraction layer decoupling the theme controller from the browser DOM.
 * Allows pure headless execution and unit testing in Node.js.
 */
export interface ThemeEnvironment {
  readonly root: ThemeTarget;
  setMetaThemeColor(color: string): void;
  prefersDark(): boolean;
  onPrefersDarkChange(cb: () => void): () => void;
}

export interface ThemeControllerOptions {
  readonly env: ThemeEnvironment;
  readonly store: KeyValueStore;
  readonly initialChoice?: ThemeChoice | string | undefined;
  readonly debugOverride?: ThemeId | undefined;
}

export interface ThemeController {
  current(): ThemeDefinition;
  choose(choice: ThemeChoice | string): void;
  subscribe(listener: (theme: ThemeDefinition) => void): () => void;
  dispose(): void;
}

/**
 * Creates and initializes the Arunodaya theme controller.
 * Handles system light/dark synchronisation, early-paint mirror persistence,
 * and session-scoped developer overrides.
 */
export function createThemeController(options: ThemeControllerOptions): ThemeController {
  const { env, store, initialChoice, debugOverride } = options;
  const isDebug = Boolean(debugOverride);

  let activeChoice: ThemeChoice;
  if (debugOverride) {
    activeChoice = { kind: 'theme', id: debugOverride };
  } else if (initialChoice) {
    activeChoice = parseThemeChoice(initialChoice);
  } else {
    const prefs = loadPrefs(store);
    activeChoice = parseThemeChoice(prefs.themeChoice);
  }

  let currentResolved: ThemeDefinition = resolveTheme(activeChoice, env.prefersDark());

  const listeners = new Set<(theme: ThemeDefinition) => void>();

  function apply(theme: ThemeDefinition, persist: boolean): void {
    currentResolved = theme;

    // 1. Apply CSS custom properties and dataset.theme via CSSOM (CSP style-src 'self')
    applyThemeToElement(env.root, theme);

    // 2. Update <meta name="theme-color">
    const metaColor = themeColorForMeta(theme);
    env.setMetaThemeColor(metaColor);

    // 3. Persist to preferences and mirror for early-paint script
    if (persist && !isDebug) {
      const prefs = loadPrefs(store);
      savePrefs(store, {
        ...prefs,
        themeChoice: serializeThemeChoice(activeChoice),
      });
      store.set(EARLY_PAINT_CANVAS_KEY, theme.tokens.canvas);
      store.set(EARLY_PAINT_MODE_KEY, theme.baseMode);
    }

    // 4. Notify subscribers
    for (const listener of listeners) {
      listener(currentResolved);
    }
  }

  // Initial application
  apply(currentResolved, !isDebug);

  // Follow system theme changes only while choice is 'system'
  const unsubscribeSystem = env.onPrefersDarkChange(() => {
    if (activeChoice.kind === 'system') {
      const nextResolved = resolveTheme(activeChoice, env.prefersDark());
      apply(nextResolved, !isDebug);
    }
  });

  return {
    current(): ThemeDefinition {
      return currentResolved;
    },
    choose(choice: ThemeChoice | string): void {
      if (isDebug) {
        // Debug override session takes precedence; do not persist user choice
        return;
      }
      activeChoice = parseThemeChoice(choice);
      const nextResolved = resolveTheme(activeChoice, env.prefersDark());
      apply(nextResolved, true);
    },
    subscribe(listener: (theme: ThemeDefinition) => void): () => void {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    dispose(): void {
      unsubscribeSystem();
      listeners.clear();
    },
  };
}
