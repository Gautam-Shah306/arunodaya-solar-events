import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  CONTRAST_CHECKS,
  DEFAULT_THEME_CHOICE,
  PACKAGE_NAME,
  SYSTEM_DARK_THEME_ID,
  SYSTEM_LIGHT_THEME_ID,
  THEME_IDS,
  THEMES,
  TOKEN_NAMES,
  WIDGET_TOKEN_NAMES,
  buildThemePreviewModel,
  contrastRatio,
  deltaE,
  evaluateDistinctness,
  evaluateTheme,
  failingChecks,
  getTheme,
  hexToHsl,
  hexToLab,
  hueDistance,
  parseHex,
  parseThemeChoice,
  relativeLuminance,
  resolveTheme,
  serializeThemeChoice,
  themeColorForMeta,
  themeCssVariables,
  toAndroidColorInt,
  widgetPaletteToAndroid,
  type ThemeChoice,
  type ThemeDefinition,
} from '../src/index.js';

describe('themes package', () => {
  function requireTheme(id: string): ThemeDefinition {
    const t = getTheme(id);
    if (!t) {
      throw new Error(`Theme not found: ${id}`);
    }
    return t;
  }

  const themeLight = requireTheme('light');
  const themeDark = requireTheme('dark');
  const themePureDark = requireTheme('pure-dark');
  const themeDarker = requireTheme('darker');
  const themeNavy = requireTheme('pack-navy');
  const themeBurgundy = requireTheme('pack-burgundy');
  const themeAubergine = requireTheme('pack-aubergine');
  const themeMidnightTeal = requireTheme('pack-midnight-teal');
  const themePorcelain = requireTheme('pack-porcelain');
  const themeSandstone = requireTheme('pack-sandstone');

  // Part B tests
  it('themes exposes its package name', () => {
    expect(PACKAGE_NAME).toBe('@arunodaya/themes');
    expect(DEFAULT_THEME_CHOICE).toEqual({ kind: 'system' });
  });

  it('parseHex reads six digit hex colours', () => {
    const res = parseHex('#1A2B3C');
    expect(res).toEqual({ r: 26, g: 43, b: 60 });

    const res8 = parseHex('#1A2B3C80');
    expect(res8).toEqual({ r: 26, g: 43, b: 60, a: 128 });
  });

  it('parseHex rejects shorthand and malformed values', () => {
    expect(parseHex('#FFF')).toBeNull();
    expect(parseHex('#FFFF')).toBeNull();
    expect(parseHex('1A2B3C')).toBeNull();
    expect(parseHex('#12345')).toBeNull();
    expect(parseHex('#1234567')).toBeNull();
    expect(parseHex('#GGGGGG')).toBeNull();
    // @ts-expect-error test non-string input
    expect(parseHex(123)).toBeNull();
  });

  it('relativeLuminance of white is 1 and black is 0', () => {
    expect(relativeLuminance('#FFFFFF')).toBeCloseTo(1, 4);
    expect(relativeLuminance('#000000')).toBe(0);
    expect(() => relativeLuminance('#FFFFFF80')).toThrow(RangeError);
    expect(() => relativeLuminance('bad')).toThrow(RangeError);
  });

  it('contrastRatio of black on white is 21', () => {
    expect(contrastRatio('#000000', '#FFFFFF')).toBe(21);
  });

  it('contrastRatio of identical colours is 1', () => {
    expect(contrastRatio('#D8B96C', '#D8B96C')).toBe(1);
  });

  it('contrastRatio is symmetric', () => {
    const r1 = contrastRatio('#14301F', '#F7F2E7');
    const r2 = contrastRatio('#F7F2E7', '#14301F');
    expect(r1).toBe(r2);
  });

  it('hexToHsl reports a gold hue near 43 degrees for D8B96C', () => {
    const hsl = hexToHsl('#D8B96C');
    expect(hsl.h).toBeGreaterThanOrEqual(42);
    expect(hsl.h).toBeLessThanOrEqual(44);
    expect(hsl.s).toBeGreaterThan(0.5);
    expect(hsl.l).toBeGreaterThan(0.6);
    expect(() => hexToHsl('#INVALID')).toThrow(RangeError);
    // grayscale coverage for delta === 0
    expect(hexToHsl('#808080')).toEqual({ h: 0, s: 0, l: 128 / 255 });
    // test g max branch
    expect(hexToHsl('#00FF00').h).toBe(120);
    // test b max branch
    expect(hexToHsl('#0000FF').h).toBe(240);
    // hueDistance wrapping
    expect(hueDistance(10, 350)).toBe(20);
    expect(hueDistance(350, 10)).toBe(20);
    expect(hueDistance(10, 20)).toBe(10);
  });

  it('deltaE is zero for identical colours and large for black versus white', () => {
    expect(deltaE('#D8B96C', '#D8B96C')).toBe(0);
    const dBlackWhite = deltaE('#000000', '#FFFFFF');
    expect(dBlackWhite).toBeGreaterThan(90);
    expect(() => hexToLab('#INVALID')).toThrow(RangeError);
  });

  it('toAndroidColorInt converts opaque hex to signed ARGB integers', () => {
    expect(toAndroidColorInt('#FFFFFF')).toBe(-1);
    expect(toAndroidColorInt('#000000')).toBe(-16777216);
    expect(toAndroidColorInt('#FF0000')).toBe(-65536);
  });

  it('toAndroidColorInt rejects hex colours with an alpha channel', () => {
    expect(() => toAndroidColorInt('#FFFFFF80')).toThrow(RangeError);
    expect(() => toAndroidColorInt('#12345')).toThrow(RangeError);
    // @ts-expect-error test non-string
    expect(() => toAndroidColorInt(null)).toThrow(RangeError);
  });

  it('widgetPaletteToAndroid converts every palette entry to a signed integer', () => {
    const converted = widgetPaletteToAndroid(themeLight.widget);
    for (const key of WIDGET_TOKEN_NAMES) {
      expect(typeof converted[key]).toBe('number');
      expect(Number.isInteger(converted[key])).toBe(true);
    }
  });

  it('contrast spec lists every required check with a unique id', () => {
    expect(CONTRAST_CHECKS.length).toBe(45);
    const ids = new Set<string>();
    for (const c of CONTRAST_CHECKS) {
      expect(ids.has(c.id), `Duplicate check id: ${c.id}`).toBe(false);
      ids.add(c.id);
      expect(c.min).toBeGreaterThan(0);
      expect(c.purpose.length).toBeGreaterThan(10);
    }
  });

  it('evaluateTheme returns one result per check with ratio and requirement', () => {
    const res = evaluateTheme(themeLight);
    expect(res.length).toBe(CONTRAST_CHECKS.length);
    for (const r of res) {
      expect(r.ratio).toBeGreaterThan(0);
      expect(r.min).toBeGreaterThan(0);
      expect(typeof r.pass).toBe('boolean');
    }
  });

  it('evaluateTheme fails a theme whose secondary text is too light', () => {
    const brokenTheme: ThemeDefinition = {
      ...themeLight,
      tokens: {
        ...themeLight.tokens,
        textSecondary: '#E8E8E8', // Light grey on light canvas = fail
      },
    };
    const res = evaluateTheme(brokenTheme);
    const failures = failingChecks(res);
    expect(failures.length).toBeGreaterThan(0);
    expect(failures.some((f) => f.id === 'text-secondary-canvas')).toBe(true);
  });

  it('failingChecks reports every failing pair with its ratio and requirement', () => {
    const brokenTheme: ThemeDefinition = {
      ...themeLight,
      tokens: {
        ...themeLight.tokens,
        textPrimary: '#F0F0F0',
      },
    };
    const res = evaluateTheme(brokenTheme);
    const failed = failingChecks(res);
    for (const f of failed) {
      expect(f.pass).toBe(false);
      expect(f.ratio).toBeLessThan(f.min);
    }
  });

  it('distinctness check fails two themes with near identical canvases', () => {
    const cloneTheme: ThemeDefinition = {
      ...themeLight,
      id: 'pack-navy', // just for test
      tokens: {
        ...themeLight.tokens,
        canvas: '#F7F2E8', // 1 step from #F7F2E7
      },
    };
    const issues = evaluateDistinctness([themeLight, cloneTheme], { minCanvasDeltaE: 6 });
    expect(issues.length).toBe(1);
    expect(issues[0]?.deltaE).toBeLessThan(6);

    // Call without options to test default parameter
    const issuesDefault = evaluateDistinctness([themeLight, cloneTheme]);
    expect(issuesDefault.length).toBe(1);
  });

  it('registry contains exactly ten themes with the expected ids in order', () => {
    expect(THEMES.length).toBe(10);
    expect(THEME_IDS.length).toBe(10);
    const expected = [
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
    ];
    expect(THEME_IDS).toEqual(expected);
    expect(THEMES.map((t) => t.id)).toEqual(expected);
  });

  it('theme ids and names are unique', () => {
    const ids = new Set<string>();
    const names = new Set<string>();
    for (const t of THEMES) {
      expect(ids.has(t.id)).toBe(false);
      expect(names.has(t.name)).toBe(false);
      ids.add(t.id);
      names.add(t.name);
    }
  });

  it('every theme defines every semantic token and every widget entry and nothing else', () => {
    for (const t of THEMES) {
      const tokenKeys = Object.keys(t.tokens).sort();
      const widgetKeys = Object.keys(t.widget).sort();
      expect(tokenKeys).toEqual([...TOKEN_NAMES].sort());
      expect(widgetKeys).toEqual([...WIDGET_TOKEN_NAMES].sort());
    }
  });

  it('every colour value is an upper case hex string', () => {
    for (const t of THEMES) {
      for (const v of Object.values(t.tokens)) {
        expect(v).toMatch(/^#[0-9A-F]{6}([0-9A-F]{2})?$/);
        expect(v).toBe(v.toUpperCase());
      }
      for (const v of Object.values(t.widget)) {
        expect(v).toMatch(/^#[0-9A-F]{6}$/);
        expect(v).toBe(v.toUpperCase());
      }
    }
  });

  it('scrim is the only token with an alpha channel', () => {
    for (const t of THEMES) {
      expect(t.tokens.scrim.length).toBe(9); // #RRGGBBAA
      for (const [k, v] of Object.entries(t.tokens)) {
        if (k !== 'scrim') {
          expect(v.length, `Token ${k} in theme ${t.id} should be 6-digit hex`).toBe(7);
        }
      }
      for (const [k, v] of Object.entries(t.widget)) {
        expect(v.length, `Widget token ${k} in theme ${t.id} should be 6-digit hex`).toBe(7);
      }
    }
  });

  it('system choice resolves to light for a light system and pure-dark for a dark system', () => {
    const lightRes = resolveTheme({ kind: 'system' }, false);
    expect(lightRes.id).toBe(SYSTEM_LIGHT_THEME_ID);
    expect(lightRes.id).toBe('light');

    const darkRes = resolveTheme({ kind: 'system' }, true);
    expect(darkRes.id).toBe(SYSTEM_DARK_THEME_ID);
    expect(darkRes.id).toBe('pure-dark');
  });

  it('explicit choice ignores the system setting', () => {
    const choice: ThemeChoice = { kind: 'theme', id: 'pack-navy' };
    expect(resolveTheme(choice, false).id).toBe('pack-navy');
    expect(resolveTheme(choice, true).id).toBe('pack-navy');

    // Fallback if explicit theme id is not in registry
    // @ts-expect-error test unknown theme id
    expect(resolveTheme({ kind: 'theme', id: 'removed-pack' }, false).id).toBe('light');
    // @ts-expect-error test unknown theme id
    expect(resolveTheme({ kind: 'theme', id: 'removed-pack' }, true).id).toBe('pure-dark');
  });

  it('parseThemeChoice accepts system and every known theme id', () => {
    expect(parseThemeChoice('system')).toEqual({ kind: 'system' });
    expect(parseThemeChoice({ kind: 'system' })).toEqual({ kind: 'system' });

    for (const id of THEME_IDS) {
      expect(parseThemeChoice(id)).toEqual({ kind: 'theme', id });
      expect(parseThemeChoice(`theme:${id}`)).toEqual({ kind: 'theme', id });
      expect(parseThemeChoice({ kind: 'theme', id })).toEqual({ kind: 'theme', id });
    }
  });

  it('parseThemeChoice falls back to system for unknown ids and malformed input', () => {
    expect(parseThemeChoice('unknown-theme')).toEqual({ kind: 'system' });
    expect(parseThemeChoice('theme:deleted-pack')).toEqual({ kind: 'system' });
    expect(parseThemeChoice({ kind: 'theme', id: 'non-existent' })).toEqual({ kind: 'system' });
    expect(parseThemeChoice({ kind: 'unknown' })).toEqual({ kind: 'system' });
    expect(parseThemeChoice(null)).toEqual({ kind: 'system' });
    expect(parseThemeChoice(undefined)).toEqual({ kind: 'system' });
    expect(parseThemeChoice(42)).toEqual({ kind: 'system' });
    expect(parseThemeChoice({})).toEqual({ kind: 'system' });
  });

  it('serializeThemeChoice round-trips every choice', () => {
    expect(serializeThemeChoice({ kind: 'system' })).toBe('system');
    expect(parseThemeChoice(serializeThemeChoice({ kind: 'system' }))).toEqual({ kind: 'system' });

    for (const id of THEME_IDS) {
      const choice: ThemeChoice = { kind: 'theme', id };
      const serialized = serializeThemeChoice(choice);
      expect(serialized).toBe(`theme:${id}`);
      expect(parseThemeChoice(serialized)).toEqual(choice);
    }
  });

  it('getTheme returns undefined for an unknown id', () => {
    expect(getTheme('non-existent')).toBeUndefined();
    expect(getTheme('light')?.id).toBe('light');
  });

  it('themeCssVariables exposes every token and widget entry as an ar prefixed custom property', () => {
    const vars = themeCssVariables(themeLight);
    for (const k of TOKEN_NAMES) {
      const kebab = k.replace(/([a-z])([A-Z0-9])/g, '$1-$2').toLowerCase();
      expect(vars[`--ar-${kebab}`]).toBeDefined();
    }
    for (const k of WIDGET_TOKEN_NAMES) {
      const kebab = k.replace(/([a-z])([A-Z0-9])/g, '$1-$2').toLowerCase();
      expect(vars[`--ar-widget-${kebab}`]).toBeDefined();
    }
  });

  it('themeCssVariables names follow the documented kebab case mapping', () => {
    const vars = themeCssVariables(themeLight);
    expect(vars['--ar-layer-1']).toBe(themeLight.tokens.layer1);
    expect(vars['--ar-border-strong']).toBe(themeLight.tokens.borderStrong);
    expect(vars['--ar-text-on-accent']).toBe(themeLight.tokens.textOnAccent);
    expect(vars['--ar-widget-surface-alt']).toBe(themeLight.widget.surfaceAlt);
  });

  it('themeCssVariables sets color-scheme from the base mode', () => {
    const lightVars = themeCssVariables(themeLight);
    expect(lightVars['color-scheme']).toBe('light');

    const darkVars = themeCssVariables(themeDark);
    expect(darkVars['color-scheme']).toBe('dark');
  });

  it('themeColorForMeta returns the canvas colour', () => {
    for (const t of THEMES) {
      expect(themeColorForMeta(t)).toBe(t.tokens.canvas);
    }
  });

  it('preview model lists a swatch for every token', () => {
    const model = buildThemePreviewModel(themeLight);
    expect(model.tokenSwatches.length).toBe(TOKEN_NAMES.length);
    expect(model.widgetSwatches.length).toBe(WIDGET_TOKEN_NAMES.length);
  });

  it('preview model includes a contrast row for every check', () => {
    const model = buildThemePreviewModel(themeLight);
    expect(model.contrastRows.length).toBe(CONTRAST_CHECKS.length);
    expect(model.sample.greeting).toBe('Good evening');
    expect(model.sample.eventRows.length).toBe(3);
    expect(model.sample.location).toBe('Rajkot');
  });

  it('preview model marks failing checks as failing', () => {
    const brokenTheme: ThemeDefinition = {
      ...themeLight,
      tokens: {
        ...themeLight.tokens,
        textPrimary: themeLight.tokens.canvas, // 1:1 contrast
      },
    };
    const model = buildThemePreviewModel(brokenTheme);
    const canvasCheck = model.contrastRows.find((r) => r.id === 'text-primary-canvas');
    expect(canvasCheck?.pass).toBe(false);
  });

  // Part C tests
  it('pure dark has a black canvas and white primary text', () => {
    expect(themePureDark.tokens.canvas).toBe('#000000');
    expect(themePureDark.tokens.textPrimary).toBe('#FFFFFF');
  });

  it('pure dark layers are neutral greys that step up in lightness', () => {
    const layers = [
      themePureDark.tokens.layer1,
      themePureDark.tokens.layer2,
      themePureDark.tokens.layer3,
    ];

    for (const hex of layers) {
      const rgb = parseHex(hex);
      expect(rgb).toBeDefined();
      if (!rgb) continue;
      expect(Math.abs(rgb.r - rgb.g)).toBeLessThanOrEqual(2);
      expect(Math.abs(rgb.g - rgb.b)).toBeLessThanOrEqual(2);
      expect(Math.abs(rgb.r - rgb.b)).toBeLessThanOrEqual(2);
    }

    const l1 = relativeLuminance(themePureDark.tokens.layer1);
    const l2 = relativeLuminance(themePureDark.tokens.layer2);
    const l3 = relativeLuminance(themePureDark.tokens.layer3);
    expect(l2).toBeGreaterThan(l1);
    expect(l3).toBeGreaterThan(l2);
  });

  it('dark base themes step up in lightness from canvas through layer 3', () => {
    const darkThemes = THEMES.filter((t) => t.baseMode === 'dark');
    for (const t of darkThemes) {
      const lc = relativeLuminance(t.tokens.canvas);
      const l1 = relativeLuminance(t.tokens.layer1);
      const l2 = relativeLuminance(t.tokens.layer2);
      const l3 = relativeLuminance(t.tokens.layer3);
      expect(l1, `Theme ${t.id} layer1 <= canvas`).toBeGreaterThan(lc);
      expect(l2, `Theme ${t.id} layer2 <= layer1`).toBeGreaterThan(l1);
      expect(l3, `Theme ${t.id} layer3 <= layer2`).toBeGreaterThan(l2);
    }
  });

  it('base mode matches canvas luminance for every theme', () => {
    for (const t of THEMES) {
      const lum = relativeLuminance(t.tokens.canvas);
      if (t.baseMode === 'light') {
        expect(lum, `Theme ${t.id} light mode should have canvas luminance > 0.5`).toBeGreaterThan(
          0.5,
        );
      } else {
        expect(lum, `Theme ${t.id} dark mode should have canvas luminance < 0.2`).toBeLessThan(0.2);
      }
    }
  });

  it('layers are distinguishable from each other by at least 2 delta E in every theme', () => {
    for (const t of THEMES) {
      const d1 = deltaE(t.tokens.canvas, t.tokens.layer1);
      const d2 = deltaE(t.tokens.layer1, t.tokens.layer2);
      const d3 = deltaE(t.tokens.layer2, t.tokens.layer3);
      expect(d1, `Theme ${t.id} canvas-layer1 dE < 2`).toBeGreaterThanOrEqual(2);
      expect(d2, `Theme ${t.id} layer1-layer2 dE < 2`).toBeGreaterThanOrEqual(2);
      expect(d3, `Theme ${t.id} layer2-layer3 dE < 2`).toBeGreaterThanOrEqual(2);
    }
  });

  it('every theme keeps its accent in the gold hue family', () => {
    for (const t of THEMES) {
      const hsl = hexToHsl(t.tokens.accent);
      expect(
        hsl.h,
        `Theme ${t.id} accent hue ${hsl.h.toString()} not between 30 and 52 degrees`,
      ).toBeGreaterThanOrEqual(30);
      expect(
        hsl.h,
        `Theme ${t.id} accent hue ${hsl.h.toString()} not between 30 and 52 degrees`,
      ).toBeLessThanOrEqual(52);
    }
  });

  it('every theme keeps its solar accent in the gold and amber hue family', () => {
    for (const t of THEMES) {
      const hsl = hexToHsl(t.tokens.solar);
      expect(
        hsl.h,
        `Theme ${t.id} solar hue ${hsl.h.toString()} not between 30 and 52 degrees`,
      ).toBeGreaterThanOrEqual(30);
      expect(
        hsl.h,
        `Theme ${t.id} solar hue ${hsl.h.toString()} not between 30 and 52 degrees`,
      ).toBeLessThanOrEqual(52);
    }
  });

  it('darker uses a darker canvas than dark', () => {
    const lDark = relativeLuminance(themeDark.tokens.canvas);
    const lDarker = relativeLuminance(themeDarker.tokens.canvas);
    expect(lDarker).toBeLessThan(lDark);
  });

  it('midnight teal is visibly distinct from darker green', () => {
    const hTeal = hexToHsl(themeMidnightTeal.tokens.canvas).h;
    const hDarker = hexToHsl(themeDarker.tokens.canvas).h;
    const hDist = hueDistance(hTeal, hDarker);
    expect(hDist, 'Canvas hue distance must be at least 25 degrees').toBeGreaterThanOrEqual(25);

    const cDE = deltaE(themeMidnightTeal.tokens.canvas, themeDarker.tokens.canvas);
    expect(cDE, 'Canvas Delta E must be at least 10').toBeGreaterThanOrEqual(10);

    const l1DE = deltaE(themeMidnightTeal.tokens.layer1, themeDarker.tokens.layer1);
    expect(l1DE, 'Layer1 Delta E must be at least 8').toBeGreaterThanOrEqual(8);
  });

  it('all theme canvases are pairwise distinct by at least 6 delta E', () => {
    const issues = evaluateDistinctness(THEMES, { minCanvasDeltaE: 6 });
    expect(issues).toEqual([]);
  });

  it('light theme widget uses a forest green surface with ivory text', () => {
    expect(themeLight.widget.surface).toBe('#1B3A2A');
    expect(themeLight.widget.textPrimary).toBe('#F7F2E7');
  });

  // Explicit contrast gate tests for each of the 10 themes
  it('contrast gate passes for theme light', () => {
    const res = evaluateTheme(themeLight);
    expect(failingChecks(res)).toEqual([]);
  });

  it('contrast gate passes for theme dark', () => {
    const res = evaluateTheme(themeDark);
    expect(failingChecks(res)).toEqual([]);
  });

  it('contrast gate passes for theme pure-dark', () => {
    const res = evaluateTheme(themePureDark);
    expect(failingChecks(res)).toEqual([]);
  });

  it('contrast gate passes for theme darker', () => {
    const res = evaluateTheme(themeDarker);
    expect(failingChecks(res)).toEqual([]);
  });

  it('contrast gate passes for theme pack-navy', () => {
    const res = evaluateTheme(themeNavy);
    expect(failingChecks(res)).toEqual([]);
  });

  it('contrast gate passes for theme pack-burgundy', () => {
    const res = evaluateTheme(themeBurgundy);
    expect(failingChecks(res)).toEqual([]);
  });

  it('contrast gate passes for theme pack-aubergine', () => {
    const res = evaluateTheme(themeAubergine);
    expect(failingChecks(res)).toEqual([]);
  });

  it('contrast gate passes for theme pack-midnight-teal', () => {
    const res = evaluateTheme(themeMidnightTeal);
    expect(failingChecks(res)).toEqual([]);
  });

  it('contrast gate passes for theme pack-porcelain', () => {
    const res = evaluateTheme(themePorcelain);
    expect(failingChecks(res)).toEqual([]);
  });

  it('contrast gate passes for theme pack-sandstone', () => {
    const res = evaluateTheme(themeSandstone);
    expect(failingChecks(res)).toEqual([]);
  });

  it('docs THEMES lists every theme id and every contrast check id', () => {
    const themesDocPath = path.resolve('docs/THEMES.md');
    const doc = fs.readFileSync(themesDocPath, 'utf8');

    for (const id of THEME_IDS) {
      expect(doc.includes(`\`${id}\``), `docs/THEMES.md must include theme ID "${id}"`).toBe(true);
    }

    for (const check of CONTRAST_CHECKS) {
      expect(
        doc.includes(`\`${check.id}\``),
        `docs/THEMES.md must include contrast check ID "${check.id}"`,
      ).toBe(true);
    }
  });

  it('app stylesheets reference only known theme variables', () => {
    const appSrc = path.resolve('apps/app/src');
    if (!fs.existsSync(appSrc)) return;

    function walkCss(dir: string): string[] {
      const files: string[] = [];
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          files.push(...walkCss(full));
        } else if (entry.isFile() && entry.name.endsWith('.css')) {
          files.push(full);
        }
      }
      return files;
    }

    const cssFiles = walkCss(appSrc);
    const validVars = new Set(Object.keys(themeCssVariables(themeLight)));
    // Also include allowed dynamic properties
    validVars.add('--ar-progress');

    const varRegex = /var\(\s*(--ar-[a-zA-Z0-9-]+)/g;
    for (const file of cssFiles) {
      const content = fs.readFileSync(file, 'utf8');
      let match: RegExpExecArray | null;
      while ((match = varRegex.exec(content)) !== null) {
        const [, varName = ''] = match;
        expect(validVars.has(varName), `Unknown variable "${varName}" found in ${file}`).toBe(true);
      }
    }
  });
});
