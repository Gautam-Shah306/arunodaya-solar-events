/**
 * Decoded RGBA channel components.
 */
export interface Rgba {
  readonly r: number;
  readonly g: number;
  readonly b: number;
  readonly a?: number;
}

/**
 * Decoded HSL representation.
 */
export interface Hsl {
  readonly h: number;
  readonly s: number;
  readonly l: number;
}

/**
 * Decoded CIE L*a*b* representation under D65 illuminant.
 */
export interface Lab {
  readonly l: number;
  readonly a: number;
  readonly b: number;
}

const HEX_6_RE = /^#([0-9a-fA-F]{2})([0-9a-fA-F]{2})([0-9a-fA-F]{2})$/;
const HEX_8_RE = /^#([0-9a-fA-F]{2})([0-9a-fA-F]{2})([0-9a-fA-F]{2})([0-9a-fA-F]{2})$/;

/**
 * Parses a hex colour string into component channels.
 * Accepts only 6-digit (#RRGGBB) and 8-digit (#RRGGBBAA) formats.
 * Rejects shorthand (#RGB, #RGBA) and invalid syntax.
 */
export function parseHex(hex: string): Rgba | null {
  if (typeof hex !== 'string') return null;

  const m6 = HEX_6_RE.exec(hex);
  if (m6) {
    const [, r = '', g = '', b = ''] = m6;
    return {
      r: parseInt(r, 16),
      g: parseInt(g, 16),
      b: parseInt(b, 16),
    };
  }

  const m8 = HEX_8_RE.exec(hex);
  if (m8) {
    const [, r = '', g = '', b = '', a = ''] = m8;
    return {
      r: parseInt(r, 16),
      g: parseInt(g, 16),
      b: parseInt(b, 16),
      a: parseInt(a, 16),
    };
  }

  return null;
}

/**
 * Parses an opaque 6-digit hex string (#RRGGBB) into RGB components or throws RangeError.
 */
function parseOpaqueRgb(hex: string): { r: number; g: number; b: number } {
  if (typeof hex !== 'string') {
    throw new RangeError(`Expected 6-digit hex string, got: ${typeof hex}`);
  }
  const m = HEX_6_RE.exec(hex);
  if (!m) {
    throw new RangeError(`Expected an opaque 6-digit hex colour (#RRGGBB), got: ${hex}`);
  }
  const [, r = '', g = '', b = ''] = m;
  return {
    r: parseInt(r, 16),
    g: parseInt(g, 16),
    b: parseInt(b, 16),
  };
}

/**
 * Computes the WCAG 2.1 relative luminance of an opaque 6-digit hex colour.
 * Throws RangeError if hex is invalid or includes an alpha channel.
 */
export function relativeLuminance(hex: string): number {
  const rgba = parseOpaqueRgb(hex);

  const linearize = (c: number): number => {
    const s = c / 255;
    return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };

  const r = linearize(rgba.r);
  const g = linearize(rgba.g);
  const b = linearize(rgba.b);

  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * Computes the WCAG contrast ratio between two opaque 6-digit hex colours.
 * Returns a value in [1, 21]. Throws RangeError on invalid or alpha colours.
 */
export function contrastRatio(fgHex: string, bgHex: string): number {
  const l1 = relativeLuminance(fgHex);
  const l2 = relativeLuminance(bgHex);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Converts an opaque 6-digit hex colour to HSL.
 * Hue is in [0, 360), saturation and lightness in [0, 1].
 */
export function hexToHsl(hex: string): Hsl {
  const rgba = parseOpaqueRgb(hex);

  const r = rgba.r / 255;
  const g = rgba.g / 255;
  const b = rgba.b / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;
  const l = (max + min) / 2;

  if (delta === 0) {
    return { h: 0, s: 0, l };
  }

  const s = l > 0.5 ? delta / (2 - max - min) : delta / (max + min);

  let h: number;
  if (max === r) {
    h = ((g - b) / delta + (g < b ? 6 : 0)) * 60;
  } else if (max === g) {
    h = ((b - r) / delta + 2) * 60;
  } else {
    h = ((r - g) / delta + 4) * 60;
  }

  return { h, s, l };
}

// D65 Standard Reference White
const D65_XN = 0.95047;
const D65_YN = 1.0;
const D65_ZN = 1.08883;
const CIE_EPSILON = 216 / 24389; // 0.008856
const CIE_KAPPA = 24389 / 27; // 903.3

/**
 * Converts an opaque 6-digit hex colour to CIE L*a*b* under D65 standard illuminant.
 */
export function hexToLab(hex: string): Lab {
  const rgba = parseOpaqueRgb(hex);

  const linearize = (c: number): number => {
    const s = c / 255;
    return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };

  const rLin = linearize(rgba.r);
  const gLin = linearize(rgba.g);
  const bLin = linearize(rgba.b);

  // sRGB to XYZ
  const x = (rLin * 0.4124 + gLin * 0.3576 + bLin * 0.1805) / D65_XN;
  const y = (rLin * 0.2126 + gLin * 0.7152 + bLin * 0.0722) / D65_YN;
  const z = (rLin * 0.0193 + gLin * 0.1192 + bLin * 0.9505) / D65_ZN;

  const f = (t: number): number => (t > CIE_EPSILON ? Math.cbrt(t) : (CIE_KAPPA * t + 16) / 116);

  const fx = f(x);
  const fy = f(y);
  const fz = f(z);

  const l = 116 * fy - 16;
  const a = 500 * (fx - fy);
  const b = 200 * (fy - fz);

  return { l, a, b };
}

/**
 * Computes CIE76 color difference (Delta E) between two opaque hex colours.
 */
export function deltaE(hex1: string, hex2: string): number {
  const lab1 = hexToLab(hex1);
  const lab2 = hexToLab(hex2);
  const dL = lab1.l - lab2.l;
  const da = lab1.a - lab2.a;
  const db = lab1.b - lab2.b;
  return Math.sqrt(dL * dL + da * da + db * db);
}

/**
 * Computes angular distance in degrees between two hue values in [0, 360].
 */
export function hueDistance(h1: number, h2: number): number {
  const mod1 = ((h1 % 360) + 360) % 360;
  const mod2 = ((h2 % 360) + 360) % 360;
  const diff = Math.abs(mod1 - mod2);
  return Math.min(diff, 360 - diff);
}
