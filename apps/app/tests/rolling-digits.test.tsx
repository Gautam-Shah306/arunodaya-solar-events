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

  it('planSlots marks unchanged characters as not changed', () => {
    const slots = planSlots('02h 48m', '02h 47m', 'down');
    expect(slots.length).toBe(7);
    expect(slots[0]?.changed).toBe(false);
    expect(slots[1]?.changed).toBe(false);
    expect(slots[2]?.changed).toBe(false);
    expect(slots[3]?.changed).toBe(false);
    expect(slots[4]?.changed).toBe(false);
    expect(slots[5]?.changed).toBe(true);
    expect(slots[6]?.changed).toBe(false);
  });

  it('planSlots applies uniform down direction on decrement', () => {
    const slots = planSlots('02h 48m', '02h 47m', 'down');
    expect(slots[5]?.changed).toBe(true);
    expect(slots[5]?.direction).toBe('down');
  });

  it('planSlots applies uniform up direction on increment', () => {
    const slots = planSlots('02h 47m', '02h 48m', 'up');
    expect(slots[5]?.changed).toBe(true);
    expect(slots[5]?.direction).toBe('up');
  });

  it('planSlots handles rollover from 03h 00m to 02h 59m uniformly down', () => {
    const slots = planSlots('03h 00m', '02h 59m', 'down');
    expect(slots.length).toBe(7);

    // '3' -> '2'
    expect(slots[1]?.changed).toBe(true);
    expect(slots[1]?.direction).toBe('down');

    // '0' -> '5' (rolls down with whole countdown, not up)
    expect(slots[4]?.changed).toBe(true);
    expect(slots[4]?.direction).toBe('down');

    // '0' -> '9' (rolls down with whole countdown, not up)
    expect(slots[5]?.changed).toBe(true);
    expect(slots[5]?.direction).toBe('down');
  });

  it('planSlots handles rollover from 10h 00m to 09h 59m uniformly down', () => {
    const slots = planSlots('10h 00m', '09h 59m', 'down');
    expect(slots.length).toBe(7);

    // '1' -> '0'
    expect(slots[0]?.changed).toBe(true);
    expect(slots[0]?.direction).toBe('down');

    // '0' -> '9'
    expect(slots[1]?.changed).toBe(true);
    expect(slots[1]?.direction).toBe('down');

    // '0' -> '5'
    expect(slots[4]?.changed).toBe(true);
    expect(slots[4]?.direction).toBe('down');

    // '0' -> '9'
    expect(slots[5]?.changed).toBe(true);
    expect(slots[5]?.direction).toBe('down');
  });

  it('planSlots handles identical strings with no changed slots', () => {
    const slots = planSlots('02h 48m', '02h 48m', 'down');
    for (const slot of slots) {
      expect(slot.changed).toBe(false);
    }
  });

  it('planSlots handles null previous text as first render', () => {
    const slots = planSlots(null, '02h 48m', 'down');
    expect(slots.length).toBe(7);
    for (const slot of slots) {
      expect(slot.changed).toBe(false);
      expect(slot.previousChar).toBeNull();
    }
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

  it('rolling digits renders static text on initial mount', async () => {
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

  it('rolling digits generates new keyed elements on transition', async () => {
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

  it('rolling digits cleans up exiting glyph after animation', async () => {
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

  it('rolling digits settles to static state after timeout', async () => {
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

  it('countdown renders accessible screen reader label', async () => {
    const root = createRoot(container);
    await act(async () => {
      root.render(<Countdown remainingMinutes={168} srLabel="Navkarshi in 2 hours 48 minutes" />);
    });

    const sr = container.querySelector('.ar-countdown-sr');
    expect(sr).not.toBeNull();
    expect(sr?.textContent).toBe('Navkarshi in 2 hours 48 minutes');
  });

  it('countdown marks visual digits as aria-hidden', async () => {
    const root = createRoot(container);
    await act(async () => {
      root.render(<Countdown remainingMinutes={168} srLabel="Navkarshi in 2 hours 48 minutes" />);
    });

    const shade = container.querySelector('.ar-countdown-shade');
    const fill = container.querySelector('.ar-countdown-fill');
    expect(shade?.getAttribute('aria-hidden')).toBe('true');
    expect(fill?.getAttribute('aria-hidden')).toBe('true');
  });

  it('countdown dual layers render with fill and shade', async () => {
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

  it('countdown respects prefers reduced motion', () => {
    const cssPath = path.resolve('apps/app/src/ui/RollingDigits.css');
    const cssContent = fs.readFileSync(cssPath, 'utf8');
    expect(cssContent).toContain('@media (prefers-reduced-motion: reduce)');
    expect(cssContent).toContain('animation: none !important');
  });
});
