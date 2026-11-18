import React from 'react';
import { moonGlyphGeometry, moonGlyphPath } from '../home/moon-glyph.js';
import './MoonPhaseGlyph.css';

export interface MoonPhaseGlyphProps {
  readonly fraction: number;
  readonly phaseName: string;
  readonly illuminationPercent: number;
  readonly size?: number;
  readonly className?: string;
}

export const MoonPhaseGlyph: React.FC<MoonPhaseGlyphProps> = ({
  fraction,
  phaseName,
  illuminationPercent,
  size = 36,
  className = '',
}) => {
  const geom = moonGlyphGeometry(fraction);
  const r = (size - 4) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const litPath = moonGlyphPath(geom, cx, cy, r);

  const accessibleLabel = `${phaseName}, ${String(illuminationPercent)}% illuminated`;

  return (
    <div
      className={`ar-moon-phase-glyph-wrap ${className}`}
      role="img"
      aria-label={accessibleLabel}
      data-testid="moon-glyph"
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${String(size)} ${String(size)}`}
        className="ar-moon-glyph-svg"
        aria-hidden="true"
      >
        {/* Dark unlit disc */}
        <circle cx={cx} cy={cy} r={r} className="ar-moon-glyph-disc" />
        {/* Lit portion */}
        {litPath && <path d={litPath} className="ar-moon-glyph-lit" />}
        {/* Subtle outline */}
        <circle cx={cx} cy={cy} r={r} className="ar-moon-glyph-ring" />
      </svg>
    </div>
  );
};
