import React from 'react';
import type { DayNightState } from '@arunodaya/engine';
import './SolarArc.css';

export interface ArcGeometry {
  readonly width: number;
  readonly height: number;
  readonly radius?: number;
}

/**
 * Calculates the (x, y) coordinates of the sun along the solar arc.
 *
 * @param fraction Progress fraction along the arc [0, 1]
 * @param geometry Width, height, and optional radius
 */
export function arcPosition(
  fraction: number,
  geometry: ArcGeometry,
): { readonly x: number; readonly y: number } {
  const { width, height } = geometry;
  const padding = 16;
  const r = geometry.radius ?? Math.min((width - padding * 2) / 2, height - padding);
  const cx = width / 2;
  const cy = height - padding;

  const clamped = Math.max(0, Math.min(1, fraction));
  const angle = Math.PI * (1 - clamped);
  const x = cx + r * Math.cos(angle);
  const y = cy - r * Math.sin(angle);
  return { x, y };
}

export interface SolarArcProps {
  readonly fraction: number | null;
  readonly dayNightState: DayNightState;
  readonly sunriseTimeText: string;
  readonly sunsetTimeText: string;
  readonly className?: string;
}

export const SolarArc: React.FC<SolarArcProps> = ({
  fraction,
  dayNightState,
  sunriseTimeText,
  sunsetTimeText,
  className = '',
}) => {
  const width = 320;
  const height = 110;
  const padding = 16;
  const r = Math.min((width - padding * 2) / 2, height - padding);
  const cx = width / 2;
  const cy = height - padding;

  const startX = cx - r;
  const startY = cy;
  const endX = cx + r;
  const endY = cy;

  const arcPath = `M ${String(startX)} ${String(startY)} A ${String(r)} ${String(r)} 0 0 1 ${String(endX)} ${String(endY)}`;

  const isDay = dayNightState === 'day' && fraction !== null;
  const sunPos = isDay ? arcPosition(fraction, { width, height, radius: r }) : null;

  const textAlternative = `Sunrise at ${sunriseTimeText}, sunset at ${sunsetTimeText}. Currently ${dayNightState}.`;

  return (
    <div
      className={`ar-solar-arc-container ${className}`}
      data-testid="solar-arc"
      aria-label={textAlternative}
      role="img"
    >
      <span className="ar-sr-only" data-testid="solar-arc-text">
        {textAlternative}
      </span>
      <svg
        viewBox={`0 0 ${String(width)} ${String(height)}`}
        className="ar-solar-arc-svg"
        aria-hidden="true"
      >
        <path
          d={arcPath}
          className={`ar-solar-arc-track ${isDay ? 'ar-solar-arc-track--day' : 'ar-solar-arc-track--night'}`}
        />
        {isDay && sunPos && (
          <g
            className="ar-solar-arc-sun"
            data-testid="solar-arc-sun"
            transform={`translate(${String(sunPos.x)}, ${String(sunPos.y)})`}
          >
            <circle r="8" className="ar-solar-arc-sun-core" />
            <circle r="14" className="ar-solar-arc-sun-glow" />
          </g>
        )}
      </svg>
      <div className="ar-solar-arc-labels" aria-hidden="true">
        <span className="ar-solar-arc-label-left">{sunriseTimeText}</span>
        <span className="ar-solar-arc-label-right">{sunsetTimeText}</span>
      </div>
    </div>
  );
};
