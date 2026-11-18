import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { countdownParts, planSlots } from '../src/ui/rolling-digits-model.js';
import { RollingDigits } from '../src/ui/RollingDigits.js';
import { Countdown } from '../src/ui/Countdown.js';

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

describe('Rolling Digits Model and Component', () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    document.body.removeChild(container);
    vi.useRealTimers();
  });

  it('planSlots marks every changed digit for rolling in the direction of the whole change', () => {
    const slots = planSlots('02h 48m', '02h 47m', 'down');
    expect(slots.length).toBe(7);
    expect(slots[5]?.changed).toBe(true);
    expect(slots[5]?.direction).toBe('down');
    expect(slots[0]?.changed).toBe(false);
  });

  it('planSlots rolls nine to zero upward on an increase', () => {
    const slots = planSlots('00h 59m', '01h 00m', 'up');
    expect(slots[5]?.changed).toBe(true);
    expect(slots[5]?.nextChar).toBe('0');
    expect(slots[5]?.previousChar).toBe('9');
    expect(slots[5]?.direction).toBe('up');
  });

  it('planSlots rolls zero to nine downward on a decrease', () => {
    const slots = planSlots('01h 00m', '00h 59m', 'down');
    expect(slots[5]?.changed).toBe(true);
    expect(slots[5]?.nextChar).toBe('9');
    expect(slots[5]?.previousChar).toBe('0');
    expect(slots[5]?.direction).toBe('down');
  });

  it('planSlots treats a missing previous digit as an entering slot', () => {
    const slots = planSlots(null, '02h 48m', 'down');
    expect(slots.length).toBe(7);
    for (const slot of slots) {
      expect(slot.changed).toBe(false);
      expect(slot.previousChar).toBeNull();
    }
  });

  it('planSlots keeps separators and unit letters unchanged', () => {
    const slots = planSlots('02h 48m', '02h 47m', 'down');
    expect(slots[2]?.changed).toBe(false); // 'h'
    expect(slots[3]?.changed).toBe(false); // ' '
    expect(slots[6]?.changed).toBe(false); // 'm'
  });

  it('RollingDigits creates new glyph elements for every change so that animations restart', async () => {
    const root = createRoot(container);
    await act(async () => {
      root.render(<RollingDigits text="02h 48m" />);
    });

    await act(async () => {
      root.render(<RollingDigits text="02h 47m" direction="down" />);
    });

    const enter = container.querySelector('.ar-roll-enter');
    const exit = container.querySelector('.ar-roll-exit');
    expect(enter).not.toBeNull();
    expect(exit).not.toBeNull();
    expect(enter?.textContent).toBe('7');
    expect(exit?.textContent).toBe('8');
  });

  it('RollingDigits restarts the roll when a second change arrives before the first finishes', async () => {
    const root = createRoot(container);
    await act(async () => {
      root.render(<RollingDigits text="02h 48m" />);
    });

    await act(async () => {
      root.render(<RollingDigits text="02h 47m" direction="down" />);
    });

    await act(async () => {
      root.render(<RollingDigits text="02h 46m" direction="down" />);
    });

    const enter = container.querySelector('.ar-roll-enter');
    expect(enter?.textContent).toBe('6');
  });

  it('RollingDigits removes the exiting glyph when the animation ends', async () => {
    const root = createRoot(container);
    await act(async () => {
      root.render(<RollingDigits text="02h 48m" />);
    });

    await act(async () => {
      root.render(<RollingDigits text="02h 47m" direction="down" />);
    });

    const exit = container.querySelector('.ar-roll-exit');
    expect(exit).not.toBeNull();

    await act(async () => {
      exit?.dispatchEvent(new Event('animationend', { bubbles: true }));
    });

    expect(container.querySelector('.ar-roll-exit')).toBeNull();
  });

  it('RollingDigits removes the exiting glyph after the safety timeout when no animation event arrives', async () => {
    vi.useFakeTimers();
    const root = createRoot(container);

    await act(async () => {
      root.render(<RollingDigits text="02h 48m" />);
    });

    await act(async () => {
      root.render(<RollingDigits text="02h 47m" direction="down" />);
    });

    expect(container.querySelector('.ar-roll-enter')).not.toBeNull();

    await act(async () => {
      vi.advanceTimersByTime(450);
    });

    expect(container.querySelector('.ar-roll-enter')).toBeNull();
    expect(container.querySelector('.ar-roll-exit')).toBeNull();
    expect(container.textContent).toBe('02h 47m');
  });

  it('RollingDigits rolls every changed digit down on decrement including zero to nine', async () => {
    const root = createRoot(container);
    await act(async () => {
      root.render(<RollingDigits text="03h 00m" />);
    });

    await act(async () => {
      root.render(<RollingDigits text="02h 59m" direction="down" />);
    });

    const slots = container.querySelectorAll('.ar-roll-slot[data-dir="down"]');
    expect(slots.length).toBeGreaterThanOrEqual(3);
  });

  it('RollingDigits rolls every changed digit up on increment including nine to zero', async () => {
    const root = createRoot(container);
    await act(async () => {
      root.render(<RollingDigits text="00h 59m" />);
    });

    await act(async () => {
      root.render(<RollingDigits text="01h 00m" direction="up" />);
    });

    const slots = container.querySelectorAll('.ar-roll-slot[data-dir="up"]');
    expect(slots.length).toBeGreaterThanOrEqual(3);
  });

  it('RollingDigits keeps unchanged digits static', async () => {
    const root = createRoot(container);
    await act(async () => {
      root.render(<RollingDigits text="02h 48m" />);
    });

    await act(async () => {
      root.render(<RollingDigits text="02h 47m" direction="down" />);
    });

    const staticSlots = container.querySelectorAll('.ar-roll-slot:not([data-dir])');
    expect(staticSlots.length).toBeGreaterThanOrEqual(5);
  });

  it('RollingDigits shows no rolling markers on first render', async () => {
    const root = createRoot(container);
    await act(async () => {
      root.render(<RollingDigits text="02h 48m" />);
    });

    const enters = container.querySelectorAll('.ar-roll-enter');
    const exits = container.querySelectorAll('.ar-roll-exit');
    expect(enters.length).toBe(0);
    expect(exits.length).toBe(0);
    expect(container.textContent).toBe('02h 48m');
  });

  it('Countdown layers animate in sync', async () => {
    const root = createRoot(container);
    await act(async () => {
      root.render(
        <Countdown
          remainingMinutes={168}
          progress={0.42}
          srLabel="Navkarshi in 2 hours 48 minutes"
          isPrimary={true}
        />,
      );
    });

    const shade = container.querySelector('.ar-countdown-shade');
    const fill = container.querySelector('.ar-countdown-fill') as HTMLElement;
    expect(shade).not.toBeNull();
    expect(fill).not.toBeNull();
    expect(fill.style.clipPath).toBe('inset(0 calc(100% - var(--ar-progress) * 100%) 0 0)');
  });

  it('roll keyframes exist for entering and exiting in both directions', () => {
    const cssPath = path.resolve('apps/app/src/ui/RollingDigits.css');
    const cssContent = fs.readFileSync(cssPath, 'utf8');
    expect(cssContent).toContain('@keyframes arRollExitDown');
    expect(cssContent).toContain('@keyframes arRollEnterDown');
    expect(cssContent).toContain('@keyframes arRollExitUp');
    expect(cssContent).toContain('@keyframes arRollEnterUp');
  });

  it('reduced motion hides the exiting glyph and removes roll animations', () => {
    const cssPath = path.resolve('apps/app/src/ui/RollingDigits.css');
    const cssContent = fs.readFileSync(cssPath, 'utf8');
    expect(cssContent).toContain('@media (prefers-reduced-motion: reduce)');
    expect(cssContent).toContain('animation: none !important');
  });

  it('countdown parts splits hours and minutes correctly', () => {
    const res = countdownParts(168);
    expect(res.hours).toBe(2);
    expect(res.minutes).toBe(48);
    expect(res.text).toBe('02h 48m');

    const zero = countdownParts(0);
    expect(zero.hours).toBe(0);
    expect(zero.minutes).toBe(0);
    expect(zero.text).toBe('00h 00m');
  });

  it('countdown renders accessible screen reader label', () => {
    const root = createRoot(container);
    act(() => {
      root.render(<Countdown remainingMinutes={168} srLabel="Navkarshi in 2 hours 48 minutes" />);
    });

    const sr = container.querySelector('.ar-countdown-sr');
    expect(sr).not.toBeNull();
    expect(sr?.textContent).toBe('Navkarshi in 2 hours 48 minutes');
  });

  it('countdown marks visual digits as aria-hidden', () => {
    const root = createRoot(container);
    act(() => {
      root.render(<Countdown remainingMinutes={168} srLabel="Navkarshi in 2 hours 48 minutes" />);
    });

    const shade = container.querySelector('.ar-countdown-shade');
    const fill = container.querySelector('.ar-countdown-fill');
    expect(shade?.getAttribute('aria-hidden')).toBe('true');
    expect(fill?.getAttribute('aria-hidden')).toBe('true');
  });
});
