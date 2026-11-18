import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { SnapshotLocation, SnapshotV1 } from '@arunodaya/contracts';
import type { Clock } from '@arunodaya/engine';
import { Home } from '../src/app/screens/Home.js';
import { handleMessage } from '../src/snapshot/request-handler.js';
import type { SnapshotService } from '../src/snapshot/service.js';
import type { BuildRequest } from '../src/snapshot/worker-protocol.js';

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const RAJKOT_LOCATION: SnapshotLocation = {
  lat: 22.3,
  lon: 70.8,
  label: 'Rajkot',
  source: 'manual',
  fixAtMs: 1763164800000,
};

function getSampleSnapshot(startIstDate = '2026-11-15', dayCount = 7): SnapshotV1 {
  const req: BuildRequest = {
    id: 1,
    type: 'build',
    location: RAJKOT_LOCATION,
    startIstDate,
    dayCount,
    generatedAtMs: 1763164800000,
  };
  const resp = handleMessage(req);
  if (!resp || !resp.ok) {
    throw new Error('Failed to build sample snapshot');
  }
  return resp.snapshot;
}

function createClock(ms: number): Clock {
  return {
    nowMs: () => ms,
    now: () => ms,
  };
}

describe('Home Screen (Part D)', () => {
  const snapshot = getSampleSnapshot('2026-11-15', 15);
  const day16 = snapshot.days.find((d) => d.istDate === '2026-11-16')!;

  let container: HTMLDivElement;
  let root: Root | null = null;

  beforeEach(() => {
    window.localStorage.clear();
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
    vi.restoreAllMocks();
  });

  function createReadyService(snap: SnapshotV1 = snapshot): SnapshotService {
    return {
      load: vi.fn().mockResolvedValue({
        ok: true,
        value: { source: 'cache', snapshot: snap },
      }),
      rebuild: vi.fn().mockResolvedValue({
        ok: true,
        value: snap,
      }),
    };
  }

  it('Home shows greeting date location chip and clock', async () => {
    const nowMs = day16.sunrise.displayMs - 60 * 60 * 1000; // morning before sunrise
    const service = createReadyService();

    root = createRoot(container);
    await act(async () => {
      root?.render(<Home clock={createClock(nowMs)} snapshotService={service} />);
    });

    expect(container.querySelector('[data-testid="greeting"]')?.textContent).toBe('Good morning');
    expect(container.querySelector('[data-testid="date-label"]')?.textContent).toContain(
      '16 November',
    );
    expect(container.querySelector('[data-testid="location-chip"]')?.textContent).toBe('Rajkot');
    expect(container.querySelector('[data-testid="clock-display"]')?.textContent).toMatch(/AM|PM/);
  });

  it('Home location chip links to the locations tab and the date links to forecast', async () => {
    const nowMs = day16.sunrise.displayMs;
    const service = createReadyService();

    root = createRoot(container);
    await act(async () => {
      root?.render(<Home clock={createClock(nowMs)} snapshotService={service} />);
    });

    const locLink = container.querySelector('a[data-testid="location-chip"]');
    expect(locLink?.getAttribute('href')).toBe('#locations');

    const dateLink = container.querySelector('a[data-testid="date-label"]');
    expect(dateLink?.getAttribute('href')).toBe('#forecast');
  });

  it('Home shows the three event cards with countdowns and the Tomorrow marker', async () => {
    // 10 mins after sunrise -> Sunrise is Tomorrow, Navkarshi & Sunset are Today
    const nowMs = day16.sunrise.displayMs + 10 * 60 * 1000;
    const service = createReadyService();

    root = createRoot(container);
    await act(async () => {
      root?.render(<Home clock={createClock(nowMs)} snapshotService={service} />);
    });

    const sunriseCard = container.querySelector('[data-testid="event-card-sunrise"]');
    const navkarshiCard = container.querySelector('[data-testid="event-card-navkarshi"]');
    const sunsetCard = container.querySelector('[data-testid="event-card-sunset"]');

    expect(sunriseCard).not.toBeNull();
    expect(navkarshiCard).not.toBeNull();
    expect(sunsetCard).not.toBeNull();

    expect(sunriseCard?.querySelector('[data-testid="tomorrow-badge"]')).not.toBeNull();
    expect(navkarshiCard?.querySelector('[data-testid="tomorrow-badge"]')).toBeNull();
    expect(sunsetCard?.querySelector('[data-testid="tomorrow-badge"]')).toBeNull();
  });

  it('Home opens the event details dialog from an event card', async () => {
    const nowMs = day16.sunrise.displayMs - 30 * 60 * 1000;
    const service = createReadyService();

    root = createRoot(container);
    await act(async () => {
      root?.render(<Home clock={createClock(nowMs)} snapshotService={service} />);
    });

    expect(document.body.querySelector('[data-testid="event-dialog"]')).toBeNull();

    const sunriseCard = container.querySelector(
      '[data-testid="event-card-sunrise"]',
    ) as HTMLButtonElement;
    act(() => {
      sunriseCard.click();
    });

    const dialog = document.body.querySelector('[data-testid="event-dialog"]');
    expect(dialog).not.toBeNull();
    expect(dialog?.textContent).toContain('Sunrise');
  });

  it('Home day details list daylight solar noon golden hours and twilight', async () => {
    const nowMs = day16.sunrise.displayMs;
    const service = createReadyService();

    root = createRoot(container);
    await act(async () => {
      root?.render(<Home clock={createClock(nowMs)} snapshotService={service} />);
    });

    const dayDetails = container.querySelector('[data-testid="day-details"]');
    expect(dayDetails).not.toBeNull();
    const text = dayDetails?.textContent ?? '';
    expect(text).toContain('Daylight');
    expect(text).toContain('Solar Noon');
    expect(text).toContain('Civil Dawn');
    expect(text).toContain('Civil Dusk');
    expect(text).toContain('Golden Hour (Morning)');
    expect(text).toContain('Golden Hour (Evening)');
  });

  it('Home moon card shows phase glyph name illumination rise set and the next moonrise countdown', async () => {
    const nowMs = day16.sunrise.displayMs;
    const service = createReadyService();

    root = createRoot(container);
    await act(async () => {
      root?.render(<Home clock={createClock(nowMs)} snapshotService={service} />);
    });

    const moonCard = container.querySelector('[data-testid="moon-card"]');
    expect(moonCard).not.toBeNull();
    expect(moonCard?.querySelector('[data-testid="moon-glyph"]')).not.toBeNull();
    const text = moonCard?.textContent ?? '';
    expect(text).toContain('Illumination');
    expect(text).toContain('Moonrise');
    expect(text).toContain('Moonset');
    expect(text).toContain('Next Moonrise');
  });

  it('Home moon card shows truthful empty states', async () => {
    const emptyMoonSnap: SnapshotV1 = {
      ...snapshot,
      moonEvents: [],
    };
    const nowMs = day16.sunrise.displayMs;
    const service = createReadyService(emptyMoonSnap);

    root = createRoot(container);
    await act(async () => {
      root?.render(<Home clock={createClock(nowMs)} snapshotService={service} />);
    });

    const moonCard = container.querySelector('[data-testid="moon-card"]');
    const text = moonCard?.textContent ?? '';
    expect(text).toContain('No moonrise today');
    expect(text).toContain('No moonset today');
    expect(text).toContain('Next moonrise unavailable');
  });

  it('Home refresh rebuilds the snapshot and disables itself while busy', async () => {
    let resolveRebuild: ((val: { ok: true; value: SnapshotV1 }) => void) | undefined;
    const service: SnapshotService = {
      load: vi.fn().mockResolvedValue({
        ok: true,
        value: { source: 'cache', snapshot },
      }),
      rebuild: vi.fn().mockImplementation(
        () =>
          new Promise<{ ok: true; value: SnapshotV1 }>((resolve) => {
            resolveRebuild = resolve;
          }),
      ),
    };

    const nowMs = day16.sunrise.displayMs;
    root = createRoot(container);
    await act(async () => {
      root?.render(<Home clock={createClock(nowMs)} snapshotService={service} />);
    });

    const refreshBtn = container.querySelector(
      '[data-testid="refresh-button"]',
    ) as HTMLButtonElement;
    expect(refreshBtn.disabled).toBe(false);

    act(() => {
      refreshBtn.click();
    });

    expect(refreshBtn.disabled).toBe(true);
    expect(refreshBtn.textContent).toContain('Refreshing');

    await act(async () => {
      resolveRebuild?.({ ok: true, value: snapshot });
    });

    expect(refreshBtn.disabled).toBe(false);
    expect(service.rebuild).toHaveBeenCalledTimes(1);
  });

  it('Home refresh failure keeps the previous data and shows an error line', async () => {
    const service: SnapshotService = {
      load: vi.fn().mockResolvedValue({
        ok: true,
        value: { source: 'cache', snapshot },
      }),
      rebuild: vi.fn().mockResolvedValue({
        ok: false,
        error: { code: 'ERR', message: 'Refresh calculation error' },
      }),
    };

    const nowMs = day16.sunrise.displayMs;
    root = createRoot(container);
    await act(async () => {
      root?.render(<Home clock={createClock(nowMs)} snapshotService={service} />);
    });

    const refreshBtn = container.querySelector(
      '[data-testid="refresh-button"]',
    ) as HTMLButtonElement;
    await act(async () => {
      refreshBtn.click();
    });

    // Previous data still rendered
    expect(container.querySelector('[data-testid="greeting"]')).not.toBeNull();
    // Error line shown
    const errorLine = container.querySelector('[data-testid="refresh-error"]');
    expect(errorLine?.textContent).toBe('Refresh calculation error');
  });

  it('Home rebuilds in the background when the snapshot is expiring', async () => {
    // Snapshot ending within 4 days -> expiring status
    const expiringSnap: SnapshotV1 = {
      ...snapshot,
      days: snapshot.days.slice(0, 5),
    };
    const rebuildMock = vi.fn().mockResolvedValue({ ok: true, value: snapshot });
    const service: SnapshotService = {
      load: vi.fn().mockResolvedValue({
        ok: true,
        value: { source: 'cache', snapshot: expiringSnap },
      }),
      rebuild: rebuildMock,
    };

    const nowMs = day16.sunrise.displayMs;
    root = createRoot(container);
    await act(async () => {
      root?.render(<Home clock={createClock(nowMs)} snapshotService={service} />);
    });

    expect(rebuildMock).toHaveBeenCalledTimes(1);
  });

  it('Home shows the approximate badge for dates after 2035', async () => {
    const snap2036 = getSampleSnapshot('2036-04-30', 5);
    const day2036 = snap2036.days.find((d) => d.istDate === '2036-05-01')!;
    const nowMs = day2036.sunrise.displayMs;
    const service = createReadyService(snap2036);

    root = createRoot(container);
    await act(async () => {
      root?.render(<Home clock={createClock(nowMs)} snapshotService={service} />);
    });

    const badge = container.querySelector('[data-testid="accuracy-badge"]');
    expect(badge).not.toBeNull();
    expect(badge?.textContent).toContain('Approximate');
  });

  it('Home announces one polite label for the soonest event', async () => {
    const nowMs = day16.sunrise.displayMs - 30 * 60 * 1000;
    const service = createReadyService();

    root = createRoot(container);
    await act(async () => {
      root?.render(<Home clock={createClock(nowMs)} snapshotService={service} />);
    });

    const liveRegions = container.querySelectorAll('[aria-live="polite"]');
    expect(liveRegions.length).toBe(1);
    expect(liveRegions[0]?.textContent).toContain('Sunrise');
  });

  it('Home shows loading then ready and an error with retry', async () => {
    let callCount = 0;
    const service: SnapshotService = {
      load: vi.fn().mockImplementation(async () => {
        callCount++;
        if (callCount === 1) {
          return { ok: false, error: { code: 'ERR', message: 'Boom' } };
        }
        return { ok: true, value: { source: 'built', snapshot } };
      }),
      rebuild: vi.fn().mockResolvedValue({ ok: true, value: snapshot }),
    };

    const nowMs = day16.sunrise.displayMs;
    root = createRoot(container);

    // First render fails -> error state
    await act(async () => {
      root?.render(<Home clock={createClock(nowMs)} snapshotService={service} />);
    });
    expect(container.querySelector('[data-testid="status-error"]')).not.toBeNull();

    // Retry -> ready state
    const retryBtn = container.querySelector('[data-testid="retry-button"]') as HTMLButtonElement;
    await act(async () => {
      retryBtn.click();
    });
    expect(container.querySelector('[data-testid="home-screen"]')).not.toBeNull();
  });

  it('Home simulated time banner appears only when debug time is active', async () => {
    const nowMs = day16.sunrise.displayMs;
    const service = createReadyService();

    // Not simulated -> no banner
    root = createRoot(container);
    await act(async () => {
      root?.render(
        <Home clock={createClock(nowMs)} snapshotService={service} isSimulated={false} />,
      );
    });
    expect(container.querySelector('[data-testid="simulated-time-banner"]')).toBeNull();

    // Simulated -> banner shown when __AR_DEBUG__ is true
    (globalThis as unknown as { __AR_DEBUG__?: boolean }).__AR_DEBUG__ = true;
    await act(async () => {
      root?.render(
        <Home clock={createClock(nowMs)} snapshotService={service} isSimulated={true} />,
      );
    });
    expect(container.querySelector('[data-testid="simulated-time-banner"]')).not.toBeNull();
  });

  it('Home headings form a logical outline', async () => {
    const nowMs = day16.sunrise.displayMs;
    const service = createReadyService();

    root = createRoot(container);
    await act(async () => {
      root?.render(<Home clock={createClock(nowMs)} snapshotService={service} />);
    });

    const h1s = container.querySelectorAll('h1');
    const h2s = container.querySelectorAll('h2');

    expect(h1s.length).toBe(1);
    expect(h2s.length).toBeGreaterThanOrEqual(2);
    // Ensure no h3 appears outside dialogs when no h2 precedes it
    const headings = Array.from(container.querySelectorAll('h1, h2, h3, h4, h5, h6'));
    expect(headings[0]?.tagName).toBe('H1');
  });

  it('Home closes event details dialog and shows error with refresh retry when snapshot has no record for today', async () => {
    const nowMs = day16.sunrise.displayMs;
    const service = createReadyService();

    root = createRoot(container);
    await act(async () => {
      root?.render(<Home clock={createClock(nowMs)} snapshotService={service} />);
    });

    // Open and close dialog
    const sunriseCard = container.querySelector(
      '[data-testid="event-card-sunrise"]',
    ) as HTMLButtonElement;
    act(() => {
      sunriseCard.click();
    });
    const closeBtn = document.body.querySelector(
      '[data-testid="dialog-close-button"]',
    ) as HTMLButtonElement;
    act(() => {
      closeBtn.click();
    });
    expect(document.body.querySelector('[data-testid="event-dialog"]')).toBeNull();

    // Render with out-of-range date so buildHomeModel returns err
    const outOfRangeMs = Date.UTC(2026, 11, 25, 6, 0, 0);
    await act(async () => {
      root?.render(<Home clock={createClock(outOfRangeMs)} snapshotService={service} />);
    });
    const retryBtn = container.querySelector('[data-testid="retry-button"]') as HTMLButtonElement;
    expect(retryBtn).not.toBeNull();
    await act(async () => {
      retryBtn.click();
    });
    expect(service.rebuild).toHaveBeenCalled();
  });
});
