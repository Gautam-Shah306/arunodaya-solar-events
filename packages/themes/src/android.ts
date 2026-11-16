import type { WidgetPalette, WidgetTokenName } from './types.js';

const OPAQUE_HEX_RE = /^#([0-9a-fA-F]{2})([0-9a-fA-F]{2})([0-9a-fA-F]{2})$/;

/**
 * Converts an opaque #RRGGBB hex string to a signed 32-bit ARGB integer (with alpha = 255).
 * Throws RangeError for invalid hex colours, shorthand colours, or hex strings with alpha channels.
 * Examples:
 * - #FFFFFF -> -1
 * - #000000 -> -16777216
 * - #FF0000 -> -65536
 */
export function toAndroidColorInt(hex: string): number {
  if (typeof hex !== 'string') {
    throw new RangeError(`Expected hex string, got: ${typeof hex}`);
  }

  const match = OPAQUE_HEX_RE.exec(hex);
  if (!match) {
    throw new RangeError(
      `toAndroidColorInt accepts only opaque 6-digit hex colours (#RRGGBB), got: ${hex}`,
    );
  }

  const [, rStr = '', gStr = '', bStr = ''] = match;
  const r = parseInt(rStr, 16);
  const g = parseInt(gStr, 16);
  const b = parseInt(bStr, 16);
  const a = 255;

  return (a << 24) | (r << 16) | (g << 8) | b | 0;
}

/**
 * Converts an entire WidgetPalette of opaque hex strings to signed 32-bit ARGB integers.
 */
export function widgetPaletteToAndroid(palette: WidgetPalette): Record<WidgetTokenName, number> {
  const result = {} as Record<WidgetTokenName, number>;
  for (const [key, value] of Object.entries(palette)) {
    result[key as WidgetTokenName] = toAndroidColorInt(value);
  }
  return result;
}
