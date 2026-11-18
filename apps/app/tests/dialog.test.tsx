import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { EventCardModel } from '../src/home/home-model.js';
import { Dialog } from '../src/ui/Dialog.js';
import { EventCard } from '../src/ui/EventCard.js';
import { EventDetailsDialog } from '../src/ui/EventDetailsDialog.js';
import { MoonPhaseGlyph } from '../src/ui/MoonPhaseGlyph.js';

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const SAMPLE_EVENT: EventCardModel = {
  id: 'sunrise',
  name: 'Sunrise',
  timeText: '06:45 AM',
  isTomorrow: false,
  remainingMinutes: 125,
  progress: 0.4,
  displayMs: 1763254800000,
  exactMs: 1763254780000,
  rule: 'start',
};

describe('Dialog, MoonPhaseGlyph and EventCard components', () => {
  let rootElement: HTMLDivElement;
  let testContainer: HTMLDivElement;
  let root: Root | null = null;

  beforeEach(() => {
    // Create #root element in DOM to test inert
    rootElement = document.createElement('div');
    rootElement.id = 'root';
    document.body.appendChild(rootElement);

    testContainer = document.createElement('div');
    document.body.appendChild(testContainer);
  });

  afterEach(() => {
    if (root) {
      act(() => {
        root?.unmount();
      });
      root = null;
    }
    document.body.removeChild(testContainer);
    document.body.removeChild(rootElement);
  });

  it('MoonPhaseGlyph renders an accessible label with phase and illumination', () => {
    root = createRoot(testContainer);
    act(() => {
      root?.render(
        <MoonPhaseGlyph fraction={0.25} phaseName="First Quarter" illuminationPercent={50} />,
      );
    });

    const glyph = testContainer.querySelector('[data-testid="moon-glyph"]');
    expect(glyph).not.toBeNull();
    const label = glyph?.getAttribute('aria-label') ?? '';
    expect(label).toContain('First Quarter');
    expect(label).toContain('50% illuminated');
  });

  it('Dialog moves focus into the dialog and returns it on close', async () => {
    vi.useFakeTimers();
    const trigger = document.createElement('button');
    trigger.id = 'trigger';
    rootElement.appendChild(trigger);
    trigger.focus();
    expect(document.activeElement).toBe(trigger);

    let isOpen = true;
    root = createRoot(testContainer);

    act(() => {
      root?.render(
        <Dialog
          isOpen={isOpen}
          onClose={() => {
            isOpen = false;
          }}
          title="Test Dialog"
        >
          <button type="button" id="inside-btn">
            Inside
          </button>
        </Dialog>,
      );
    });

    act(() => {
      vi.runAllTimers();
    });

    const closeBtn = document.body.querySelector('[data-testid="dialog-close-button"]');
    expect(closeBtn).not.toBeNull();

    // Close dialog
    act(() => {
      root?.render(
        <Dialog isOpen={false} onClose={() => {}} title="Test Dialog">
          <button type="button" id="inside-btn">
            Inside
          </button>
        </Dialog>,
      );
    });

    expect(document.activeElement).toBe(trigger);
    vi.useRealTimers();
  });

  it('Dialog closes on escape on the close button and on backdrop click', () => {
    const handleClose = vi.fn();
    root = createRoot(testContainer);

    act(() => {
      root?.render(
        <Dialog isOpen={true} onClose={handleClose} title="Close Tests">
          <p>Body</p>
        </Dialog>,
      );
    });

    // 1. Close button click
    const closeBtn = document.body.querySelector('[data-testid="dialog-close-button"]');
    act(() => {
      (closeBtn as HTMLButtonElement).click();
    });
    expect(handleClose).toHaveBeenCalledTimes(1);

    // 2. Escape key
    act(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    });
    expect(handleClose).toHaveBeenCalledTimes(2);

    // 3. Backdrop click
    const backdrop = document.body.querySelector('[data-testid="dialog-backdrop"]');
    act(() => {
      backdrop?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    expect(handleClose).toHaveBeenCalledTimes(3);
  });

  it('Dialog keeps tab focus inside the dialog', () => {
    root = createRoot(testContainer);

    act(() => {
      root?.render(
        <Dialog isOpen={true} onClose={() => {}} title="Trap Test">
          <button type="button" id="first-btn">
            First
          </button>
          <button type="button" id="last-btn">
            Last
          </button>
        </Dialog>,
      );
    });

    const closeBtn = document.body.querySelector(
      '[data-testid="dialog-close-button"]',
    ) as HTMLElement;
    const lastBtn = document.body.querySelector('#last-btn') as HTMLElement;

    // Focus last button and press Tab -> wraps to first
    lastBtn.focus();
    const tabEvent = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true });
    act(() => {
      document.dispatchEvent(tabEvent);
    });
    expect(tabEvent.defaultPrevented).toBe(true);

    // Focus first button (close button) and press Shift+Tab -> wraps to last
    closeBtn.focus();
    const shiftTabEvent = new KeyboardEvent('keydown', {
      key: 'Tab',
      shiftKey: true,
      bubbles: true,
      cancelable: true,
    });
    act(() => {
      document.dispatchEvent(shiftTabEvent);
    });
    expect(shiftTabEvent.defaultPrevented).toBe(true);
  });

  it('Dialog makes the page behind it inert while open', () => {
    expect(rootElement.hasAttribute('inert')).toBe(false);

    root = createRoot(testContainer);
    act(() => {
      root?.render(
        <Dialog isOpen={true} onClose={() => {}} title="Inert Test">
          <p>Inert Content</p>
        </Dialog>,
      );
    });

    expect(rootElement.hasAttribute('inert')).toBe(true);

    act(() => {
      root?.render(
        <Dialog isOpen={false} onClose={() => {}} title="Inert Test">
          <p>Inert Content</p>
        </Dialog>,
      );
    });

    expect(rootElement.hasAttribute('inert')).toBe(false);
  });

  it('EventDetailsDialog explains the event the rounding rule and the accuracy note without seconds', () => {
    root = createRoot(testContainer);
    act(() => {
      root?.render(
        <EventDetailsDialog
          isOpen={true}
          onClose={() => {}}
          event={SAMPLE_EVENT}
          isApproximate={false}
        />,
      );
    });

    const dialogEl = document.body.querySelector('[data-testid="event-dialog"]');
    expect(dialogEl).not.toBeNull();
    const text = dialogEl?.textContent ?? '';

    expect(text).toContain('Sunrise');
    expect(text).toContain('Display Rounding');
    expect(text).toContain('Astronomical Accuracy');

    // No seconds anywhere in the dialog text
    expect(text).not.toMatch(/\bseconds?\b/i);
    expect(text).not.toMatch(/:\d{2}:\d{2}\b/);
  });

  it('EventCard is a button whose name contains the event and its countdown', () => {
    const handleClick = vi.fn();
    root = createRoot(testContainer);

    act(() => {
      root?.render(<EventCard event={SAMPLE_EVENT} isSoonest={true} onClick={handleClick} />);
    });

    const btn = testContainer.querySelector('button[data-testid="event-card-sunrise"]');
    expect(btn).not.toBeNull();

    const ariaLabel = btn?.getAttribute('aria-label') ?? '';
    expect(ariaLabel).toContain('Sunrise');
    expect(ariaLabel).toContain('06:45 AM');
    expect(ariaLabel).toContain('2 hours 5 minutes');

    act(() => {
      (btn as HTMLButtonElement).click();
    });
    expect(handleClick).toHaveBeenCalledWith(SAMPLE_EVENT);
  });

  it('EventDetailsDialog covers navkarshi, sunset, approximate, tomorrow, and null event', () => {
    root = createRoot(testContainer);

    // Null event renders nothing
    act(() => {
      root?.render(<EventDetailsDialog isOpen={true} onClose={() => {}} event={null} />);
    });
    expect(document.body.querySelector('[data-testid="event-dialog"]')).toBeNull();

    // Navkarshi with tomorrow + approximate
    const navkarshiEvent: EventCardModel = {
      ...SAMPLE_EVENT,
      id: 'navkarshi',
      name: 'Navkarshi',
      isTomorrow: true,
    };
    act(() => {
      root?.render(
        <EventDetailsDialog
          isOpen={true}
          onClose={() => {}}
          event={navkarshiEvent}
          isApproximate={true}
        />,
      );
    });
    const navText = document.body.querySelector('[data-testid="event-dialog"]')?.textContent ?? '';
    expect(navText).toContain('Navkarshi');
    expect(navText).toContain('Tomorrow');
    expect(navText).toContain('2035');

    // Sunset
    const sunsetEvent: EventCardModel = {
      ...SAMPLE_EVENT,
      id: 'sunset',
      name: 'Sunset',
      rule: 'end',
    };
    act(() => {
      root?.render(
        <EventDetailsDialog
          isOpen={true}
          onClose={() => {}}
          event={sunsetEvent}
          isApproximate={false}
        />,
      );
    });
    const setText = document.body.querySelector('[data-testid="event-dialog"]')?.textContent ?? '';
    expect(setText).toContain('Sunset');
    expect(setText).toContain('floor');
  });

  it('Dialog traps focus when active element is outside and ignores clicks inside dialog body', () => {
    const handleClose = vi.fn();
    root = createRoot(testContainer);

    act(() => {
      root?.render(
        <Dialog isOpen={true} onClose={handleClose} title="Edge Cases">
          <p id="inner-text">Static content</p>
        </Dialog>,
      );
    });

    // Click inside dialog body -> does NOT close
    const inner = document.body.querySelector('#inner-text') as HTMLElement;
    act(() => {
      inner.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    expect(handleClose).not.toHaveBeenCalled();

    // Active element outside dialog -> Tab moves focus into dialog
    document.body.focus();
    const tabOutside = new KeyboardEvent('keydown', {
      key: 'Tab',
      bubbles: true,
      cancelable: true,
    });
    act(() => {
      document.dispatchEvent(tabOutside);
    });
    expect(tabOutside.defaultPrevented).toBe(true);

    // No title + disabled close button -> empty focusables branch
    act(() => {
      root?.render(
        <Dialog isOpen={true} onClose={handleClose}>
          <p>Untitled</p>
        </Dialog>,
      );
    });
    const closeBtn = document.body.querySelector(
      '[data-testid="dialog-close-button"]',
    ) as HTMLButtonElement;
    closeBtn.setAttribute('disabled', '');
    const tabEmpty = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true });
    act(() => {
      document.dispatchEvent(tabEmpty);
    });
    expect(tabEmpty.defaultPrevented).toBe(true);
  });
});
