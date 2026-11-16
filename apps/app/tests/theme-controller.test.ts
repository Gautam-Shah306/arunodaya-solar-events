import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { describe, expect, it } from 'vitest';
import {
  createThemeController,
  EARLY_PAINT_CANVAS_KEY,
  EARLY_PAINT_MODE_KEY,
  type ThemeEnvironment,
} from '../src/core/theme-controller.js';
import { createMemoryStore } from '../src/core/storage.js';
import { PREFS_KEY, type Prefs } from '../src/core/prefs.js';
import type { ThemeTarget } from '../src/theme/apply-theme.js';

function createMockEnv(initialPrefersDark = false): {
  env: ThemeEnvironment;
  target: ThemeTarget;
  metaColor: string;
  triggerPrefersDark(isDark: boolean): void;
} {
  let isDark = initialPrefersDark;
  const callbacks = new Set<() => void>();
  let metaColor = '';

  const target: ThemeTarget = {
    dataset: {},
    style: {
      setProperty(name: string, value: string) {
        (target.style as Record<string, unknown>)[name] = value;
      },
    },
  };

  const env: ThemeEnvironment = {
    root: target,
    setMetaThemeColor(color: string) {
      metaColor = color;
    },
    prefersDark() {
      return isDark;
    },
    onPrefersDarkChange(cb: () => void) {
      callbacks.add(cb);
      return () => callbacks.delete(cb);
    },
  };

  return {
    env,
    target,
    get metaColor() {
      return metaColor;
    },
    triggerPrefersDark(dark: boolean) {
      isDark = dark;
      for (const cb of callbacks) cb();
    },
  };
}

describe('Theme Controller and Early Paint', () => {
  it('theme controller applies the light theme for a light system with the system choice', () => {
    const { env, target } = createMockEnv(false);
    const store = createMemoryStore();
    const ctrl = createThemeController({ env, store, initialChoice: 'system' });

    expect(ctrl.current().id).toBe('light');
    expect(target.dataset.theme).toBe('light');
  });

  it('theme controller applies pure dark for a dark system with the system choice', () => {
    const { env, target } = createMockEnv(true);
    const store = createMemoryStore();
    const ctrl = createThemeController({ env, store, initialChoice: 'system' });

    expect(ctrl.current().id).toBe('pure-dark');
    expect(target.dataset.theme).toBe('pure-dark');
  });

  it('theme controller follows system changes only while the choice is system', () => {
    const { env, target, triggerPrefersDark } = createMockEnv(false);
    const store = createMemoryStore();
    const ctrl = createThemeController({ env, store, initialChoice: 'system' });

    expect(target.dataset.theme).toBe('light');

    // System switches to dark while choice is system -> Pure Dark
    triggerPrefersDark(true);
    expect(target.dataset.theme).toBe('pure-dark');

    // User chooses explicit theme -> system changes are ignored
    ctrl.choose('pack-navy');
    expect(target.dataset.theme).toBe('pack-navy');

    triggerPrefersDark(false);
    expect(target.dataset.theme).toBe('pack-navy');
  });

  it('theme controller persists the choice and mirrors canvas and mode for early paint', () => {
    const { env } = createMockEnv(false);
    const store = createMemoryStore();
    const ctrl = createThemeController({ env, store });

    ctrl.choose('pack-sandstone');

    const rawPrefs = store.get(PREFS_KEY);
    expect(rawPrefs).not.toBeNull();
    const prefs = JSON.parse(rawPrefs!) as Prefs;
    expect(prefs.themeChoice).toBe('theme:pack-sandstone');

    // Check early-paint mirrored keys
    expect(store.get(EARLY_PAINT_CANVAS_KEY)).toBe('#F2E3C6');
    expect(store.get(EARLY_PAINT_MODE_KEY)).toBe('light');
  });

  it('theme controller updates the theme-color meta element', () => {
    const mock = createMockEnv(false);
    const store = createMemoryStore();
    const ctrl = createThemeController({ env: mock.env, store });

    ctrl.choose('pure-dark');
    expect(mock.metaColor).toBe('#000000');

    ctrl.choose('light');
    expect(mock.metaColor).toBe('#F7F2E7');
  });

  it('theme controller falls back to the system choice for an unknown stored id', () => {
    const { env, target } = createMockEnv(false);
    const store = createMemoryStore();
    store.set(
      PREFS_KEY,
      JSON.stringify({
        version: 1,
        themeChoice: 'non-existent-theme-xyz',
        clockFormat: '12h',
        location: { lat: 22.3, lon: 70.8, label: 'Rajkot', source: 'manual', fixAtMs: 0 },
      }),
    );

    const ctrl = createThemeController({ env, store });
    expect(ctrl.current().id).toBe('light'); // light system default
    expect(target.dataset.theme).toBe('light');
  });

  it('theme controller debug override persists nothing', () => {
    const { env, target } = createMockEnv(false);
    const store = createMemoryStore();
    store.set(
      PREFS_KEY,
      JSON.stringify({
        version: 1,
        themeChoice: 'light',
        clockFormat: '12h',
        location: { lat: 22.3, lon: 70.8, label: 'Rajkot', source: 'manual', fixAtMs: 0 },
      }),
    );

    const ctrl = createThemeController({
      env,
      store,
      debugOverride: 'pack-navy',
    });

    expect(ctrl.current().id).toBe('pack-navy');
    expect(target.dataset.theme).toBe('pack-navy');

    // Stored preferences and early paint keys must not be overwritten by debug override
    const rawPrefs = store.get(PREFS_KEY);
    const prefs = JSON.parse(rawPrefs!) as Prefs;
    expect(prefs.themeChoice).toBe('light');
    expect(store.get(EARLY_PAINT_CANVAS_KEY)).toBeNull();
  });

  it('early theme script sets background and color scheme from stored values', () => {
    const scriptPath = path.resolve('apps/app/public/early-theme.js');
    const scriptCode = fs.readFileSync(scriptPath, 'utf8');

    const mockStorage = new Map<string, string>([
      ['arunodaya.theme.mode', 'dark'],
      ['arunodaya.theme.canvas', '#07150E'],
    ]);

    const contextDoc = {
      documentElement: {
        style: {
          colorScheme: '',
          backgroundColor: '',
        },
      },
    };

    const sandbox = {
      localStorage: {
        getItem(key: string) {
          return mockStorage.get(key) ?? null;
        },
      },
      document: contextDoc,
    };

    vm.createContext(sandbox);
    vm.runInContext(scriptCode, sandbox);

    expect(contextDoc.documentElement.style.colorScheme).toBe('dark');
    expect(contextDoc.documentElement.style.backgroundColor).toBe('#07150E');
  });

  it('early theme script ignores malformed stored values and never throws', () => {
    const scriptPath = path.resolve('apps/app/public/early-theme.js');
    const scriptCode = fs.readFileSync(scriptPath, 'utf8');

    const contextDoc = {
      documentElement: {
        style: {
          colorScheme: 'initial',
          backgroundColor: 'initial',
        },
      },
    };

    const sandbox = {
      localStorage: {
        getItem(key: string) {
          if (key === 'arunodaya.theme.mode') return 'invalid-mode';
          if (key === 'arunodaya.theme.canvas') return 'red; url(x)'; // CSS injection attempt
          return null;
        },
      },
      document: contextDoc,
    };

    vm.createContext(sandbox);
    expect(() => vm.runInContext(scriptCode, sandbox)).not.toThrow();

    expect(contextDoc.documentElement.style.colorScheme).toBe('initial');
    expect(contextDoc.documentElement.style.backgroundColor).toBe('initial');
  });
});
