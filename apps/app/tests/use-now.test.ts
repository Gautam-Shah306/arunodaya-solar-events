import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Clock } from '@arunodaya/engine';
import { useNow } from '../src/ui/use-now.js';

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function TestComponent({ clock, onTick }: { clock: Clock; onTick: (ms: number) => void }) {
  const now = useNow(clock);
  React.useEffect(() => {
    onTick(now);
  }, [now, onTick]);
  return React.createElement('div', { 'data-testid': 'now' }, String(now));
}

describe('useNow hook', () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    vi.useFakeTimers();
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
    document.body.removeChild(container);
  });

  it('useNow ticks at the next minute boundary', () => {
    let currentTime = 1763274615000; // 15 seconds into minute
    const clock: Clock = {
      nowMs: () => currentTime,
      now: () => currentTime,
    };

    const ticks: number[] = [];
    const root = createRoot(container);

    act(() => {
      root.render(
        React.createElement(TestComponent, {
          clock,
          onTick: (t: number) => {
            ticks.push(t);
          },
        }),
      );
    });

    expect(ticks).toEqual([1763274615000]);

    // Advance clock past the next minute boundary (+ 45.020s)
    currentTime = 1763274660020;
    act(() => {
      vi.advanceTimersByTime(45025);
    });

    expect(ticks).toEqual([1763274615000, 1763274660020]);
  });

  it('useNow re-syncs on document visibility change', () => {
    let currentTime = 1763274610000;
    const clock: Clock = {
      nowMs: () => currentTime,
      now: () => currentTime,
    };

    const ticks: number[] = [];
    const root = createRoot(container);

    act(() => {
      root.render(
        React.createElement(TestComponent, {
          clock,
          onTick: (t: number) => {
            ticks.push(t);
          },
        }),
      );
    });

    expect(ticks).toEqual([1763274610000]);

    // Advance time outside of timer, e.g. waking up from sleep
    currentTime = 1763274900000;

    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
    });

    expect(ticks).toEqual([1763274610000, 1763274900000]);
  });
});
