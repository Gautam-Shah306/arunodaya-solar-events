import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { Countdown } from '../src/ui/Countdown.js';

// Configure act environment for happy-dom
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

describe('Countdown Component', () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    document.body.removeChild(container);
  });

  it('countdown renders shade and fill layers clipped by progress custom property', async () => {
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

    const rootEl = container.querySelector('.ar-countdown') as HTMLElement;
    expect(rootEl).not.toBeNull();

    const shadeLayer = container.querySelector('.ar-countdown-shade');
    const fillLayer = container.querySelector('.ar-countdown-fill') as HTMLElement;

    expect(shadeLayer).not.toBeNull();
    expect(fillLayer).not.toBeNull();
    expect(fillLayer.style.clipPath).toBe('inset(0 calc(100% - var(--ar-progress) * 100%) 0 0)');
  });

  it('countdown provides an accessible label and keeps visual layers aria-hidden', async () => {
    const root = createRoot(container);
    await act(async () => {
      root.render(
        <Countdown remainingMinutes={45} progress={0.5} srLabel="Sunset in 45 minutes" />,
      );
    });

    const srText = container.querySelector('.ar-countdown-sr');
    expect(srText).not.toBeNull();
    expect(srText?.textContent).toBe('Sunset in 45 minutes');

    const shadeLayer = container.querySelector('.ar-countdown-shade');
    const fillLayer = container.querySelector('.ar-countdown-fill');

    expect(shadeLayer?.getAttribute('aria-hidden')).toBe('true');
    expect(fillLayer?.getAttribute('aria-hidden')).toBe('true');
  });

  it('countdown applies tabular lining figures style hook', async () => {
    const root = createRoot(container);
    await act(async () => {
      root.render(<Countdown remainingMinutes={30} srLabel="Sunrise in 30 minutes" />);
    });

    const rootEl = container.querySelector('.ar-countdown');
    expect(rootEl).not.toBeNull();
    expect(rootEl?.classList.contains('ar-tnum')).toBe(true);
  });

  it('countdown updates direction when remainingMinutes changes up or down', async () => {
    const root = createRoot(container);
    await act(async () => {
      root.render(<Countdown remainingMinutes={60} srLabel="Sunrise in 1 hour" />);
    });
    await act(async () => {
      root.render(<Countdown remainingMinutes={59} srLabel="Sunrise in 59 minutes" />);
    });
    expect(container.querySelector('.ar-roll-slot[data-dir="down"]')).not.toBeNull();

    await act(async () => {
      root.render(<Countdown remainingMinutes={60} srLabel="Sunrise in 1 hour" />);
    });
    expect(container.querySelector('.ar-roll-slot[data-dir="up"]')).not.toBeNull();
  });
});
