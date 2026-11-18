export interface MoonGlyphGeometry {
  readonly fraction: number;
  readonly isWaxing: boolean;
  readonly illumination: number;
  readonly ratio: number;
}

/**
 * Computes moon phase geometric parameters from a continuous fraction [0, 1).
 *
 * @param fraction Moon phase fraction [0, 1) where 0 is New Moon, 0.5 is Full Moon
 */
export function moonGlyphGeometry(fraction: number): MoonGlyphGeometry {
  const norm = ((fraction % 1) + 1) % 1;
  const isWaxing = norm <= 0.5;
  const angle = 2 * Math.PI * norm;
  // Illumination fraction [0, 1]
  const illumination = 0.5 * (1 - Math.cos(angle));
  // Ratio represents terminator curve curvature [-1, 1]
  const ratio = -Math.cos(angle);

  return {
    fraction: norm,
    isWaxing,
    illumination,
    ratio,
  };
}

/**
 * Returns the illuminated area fraction of the lunar disc [0, 1].
 *
 * @param geometry Computed MoonGlyphGeometry
 */
export function litAreaFraction(geometry: MoonGlyphGeometry): number {
  return geometry.illumination;
}

/**
 * Generates an SVG path `d` string representing the illuminated portion of the moon.
 *
 * @param geometry MoonGlyphGeometry descriptor
 * @param cx Center X coordinate
 * @param cy Center Y coordinate
 * @param r Disc radius
 */
export function moonGlyphPath(
  geometry: MoonGlyphGeometry,
  cx: number,
  cy: number,
  r: number,
): string {
  const { fraction, isWaxing, ratio } = geometry;

  // New Moon: virtually no illuminated area
  if (fraction < 0.005 || fraction > 0.995) {
    return '';
  }

  const cxStr = String(cx);
  const rStr = String(r);
  const topYStr = String(cy - r);
  const bottomYStr = String(cy + r);

  // Full Moon: full disc circle
  if (Math.abs(fraction - 0.5) < 0.005) {
    return `M ${cxStr} ${topYStr} A ${rStr} ${rStr} 0 1 1 ${cxStr} ${bottomYStr} A ${rStr} ${rStr} 0 1 1 ${cxStr} ${topYStr} Z`;
  }

  const rxStr = String(Math.max(0.001, Math.abs(ratio) * r));

  if (isWaxing) {
    // Waxing: right hemisphere illuminated
    // Outer edge: right semicircle from top to bottom
    // Terminator: from bottom back to top
    // If ratio >= 0 (gibbous): terminator sweeps left (sweep 1)
    // If ratio < 0 (crescent): terminator sweeps right (sweep 0)
    const sweepStr = ratio >= 0 ? '1' : '0';
    return `M ${cxStr} ${topYStr} A ${rStr} ${rStr} 0 0 1 ${cxStr} ${bottomYStr} A ${rxStr} ${rStr} 0 0 ${sweepStr} ${cxStr} ${topYStr} Z`;
  }

  // Waning: left hemisphere illuminated
  // Outer edge: left semicircle from top to bottom
  // Terminator: from bottom back to top
  // If ratio >= 0 (gibbous): terminator sweeps right (sweep 0)
  // If ratio < 0 (crescent): terminator sweeps left (sweep 1)
  const sweepStr = ratio >= 0 ? '0' : '1';
  return `M ${cxStr} ${topYStr} A ${rStr} ${rStr} 0 0 0 ${cxStr} ${bottomYStr} A ${rxStr} ${rStr} 0 0 ${sweepStr} ${cxStr} ${topYStr} Z`;
}
