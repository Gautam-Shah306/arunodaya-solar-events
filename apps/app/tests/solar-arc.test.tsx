import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { arcPosition, SolarArc } from '../src/ui/SolarArc.js';

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe('SolarArc and arcPosition', () => {
  let container: HTMLDivElement;
  let root: Root | null = null;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    if (root) {
      act(() => {
        root?.unmount();
      });
      root = null;
    }
    document.body.removeChild(container);
  });

  it('arcPosition places the sun at the start in the middle and at the end of the arc', () => {
    const geom = { width: 320, height: 110 };
    const start = arcPosition(0, geom);
    const mid = arcPosition(0.5, geom);
    const end = arcPosition(1, geom);

    expect(start.x).toBeLessThan(160);
    expect(mid.x).toBeCloseTo(160, 5);
    expect(mid.y).toBeLessThan(start.y);
    expect(end.x).toBeGreaterThan(160);
    expect(end.y).toBeCloseTo(start.y, 5);
  });

  it('SolarArc places the sun at the fraction along the arc by day', () => {
    root = createRoot(container);
    act(() => {
      root?.render(
        <SolarArc
          fraction={0.5}
          dayNightState="day"
          sunriseTimeText="06:30 AM"
          sunsetTimeText="06:00 PM"
        />,
      );
    });

    const sun = container.querySelector('[data-testid="solar-arc-sun"]');
    expect(sun).not.toBeNull();
    const transform = sun?.getAttribute('transform') ?? '';
    expect(transform).toContain('translate(160,');

    const track = container.querySelector('.ar-solar-arc-track');
    expect(track?.classList.contains('ar-solar-arc-track--day')).toBe(true);
  });

  it('SolarArc hides the sun and dims the arc at night', () => {
    root = createRoot(container);
    act(() => {
      root?.render(
        <SolarArc
          fraction={null}
          dayNightState="night"
          sunriseTimeText="06:30 AM"
          sunsetTimeText="06:00 PM"
        />,
      );
    });

    const sun = container.querySelector('[data-testid="solar-arc-sun"]');
    expect(sun).toBeNull();

    const track = container.querySelector('.ar-solar-arc-track');
    expect(track?.classList.contains('ar-solar-arc-track--night')).toBe(true);
  });

  it('SolarArc exposes a text alternative with sunrise sunset and the current state', () => {
    root = createRoot(container);
    act(() => {
      root?.render(
        <SolarArc
          fraction={0.25}
          dayNightState="day"
          sunriseTimeText="06:45 AM"
          sunsetTimeText="05:50 PM"
        />,
      );
    });

    const arcContainer = container.querySelector('[data-testid="solar-arc"]');
    const ariaLabel = arcContainer?.getAttribute('aria-label') ?? '';
    expect(ariaLabel).toContain('06:45 AM');
    expect(ariaLabel).toContain('05:50 PM');
    expect(ariaLabel).toContain('day');
  });
});
