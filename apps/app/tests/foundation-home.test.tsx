import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { DayRecord, SnapshotV1 } from '@arunodaya/contracts';
import { FoundationHome } from '../src/app/screens/FoundationHome.js';
import type { SnapshotService } from '../src/snapshot/service.js';

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

// 2026-11-16 in IST (+05:30):
// Day start (00:00 IST): 1794767400000
// 06:00 IST: 1794789000000
// 06:30 IST: 1794790800000 (Civil dawn)
// 07:00 IST: 1794792600000 (Sunrise)
// 07:15 IST: 1794793500000 (Test instant)
// 07:48 IST: 1794795480000 (Navkarshi)
// 12:30 IST: 1794812400000 (Solar noon)
// 18:00 IST: 1794832200000 (Sunset)
// 18:30 IST: 1794834000000 (Civil dusk)
const MOCK_DAY: DayRecord = {
  istDate: '2026-11-16',
  sunrise: { exactMs: 1794792600000, displayMs: 1794792600000 },
  navkarshi: { exactMs: 1794795480000, displayMs: 1794795480000 },
  sunset: { exactMs: 1794832200000, displayMs: 1794832200000 },
  civilDawn: { exactMs: 1794790800000, displayMs: 1794790800000 },
  civilDusk: { exactMs: 1794834000000, displayMs: 1794834000000 },
  solarNoonMs: 1794812400000,
  goldenMorning: {
    start: { exactMs: 1794792600000, displayMs: 1794792600000 },
    end: { exactMs: 1794796200000, displayMs: 1794796200000 },
  },
  goldenEvening: {
    start: { exactMs: 1794828600000, displayMs: 1794828600000 },
    end: { exactMs: 1794832200000, displayMs: 1794832200000 },
  },
  moonPhaseAtNoon: { phase: 0.5, illumination: 1.0 },
};

const MOCK_SNAPSHOT: SnapshotV1 = {
  schemaVersion: 1,
  engine: { name: 'astronomy-engine', version: '2.1.19' },
  generatedAtMs: 1794767400000,
  location: {
    lat: 22.3,
    lon: 70.8,
    label: 'Rajkot',
    source: 'manual',
    fixAtMs: 1794767400000,
  },
  days: [MOCK_DAY],
  moonEvents: [],
};

function createMockSnapshotService(): SnapshotService {
  return {
    async load() {
      return {
        ok: true,
        value: {
          snapshot: MOCK_SNAPSHOT,
          source: 'cache' as const,
        },
      };
    },
  };
}

describe('FoundationHome Screen', () => {
  let container: HTMLDivElement;
  let root: Root | null = null;

  beforeEach(() => {
    vi.useFakeTimers();
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    if (root) {
      act(() => {
        root!.unmount();
      });
      root = null;
    }
    vi.restoreAllMocks();
    vi.useRealTimers();
    if (container.parentNode) {
      document.body.removeChild(container);
    }
  });

  it('foundation home renders greeting, date, and three countdowns', async () => {
    // 2026-11-16 06:00 IST (before sunrise)
    const fixedNow = 1794789000000;
    const clock = { now: () => fixedNow, nowMs: () => fixedNow };
    const service = createMockSnapshotService();

    root = createRoot(container);
    await act(async () => {
      root!.render(<FoundationHome clock={clock} snapshotService={service} />);
    });

    // Check greeting and date
    const greetingEl = container.querySelector('.ar-home-greeting');
    const dateEl = container.querySelector('.ar-home-date');
    expect(greetingEl?.textContent).toBe('Good morning');
    expect(dateEl?.textContent).toBe('Mon 16 November');

    // Check three countdown cards
    const cards = container.querySelectorAll('.ar-home-card');
    expect(cards.length).toBe(3);

    const labels = Array.from(container.querySelectorAll('.ar-home-card-label')).map(
      (el) => el.textContent,
    );
    expect(labels).toContain('Sunrise');
    expect(labels).toContain('Navkarshi');
    expect(labels).toContain('Sunset');
  });

  it('foundation home displays primary emphasis on the next major event', async () => {
    // 2026-11-16 07:15 IST (after sunrise 07:00, before navkarshi 07:48)
    const fixedNow = 1794793500000;
    const clock = { now: () => fixedNow, nowMs: () => fixedNow };
    const service = createMockSnapshotService();

    root = createRoot(container);
    await act(async () => {
      root!.render(<FoundationHome clock={clock} snapshotService={service} />);
    });

    const primaryCards = container.querySelectorAll('.ar-home-card--primary');
    expect(primaryCards.length).toBe(1);

    const primaryLabel = primaryCards[0]?.querySelector('.ar-home-card-label');
    expect(primaryLabel?.textContent).toBe('Navkarshi');
  });

  it('foundation home updates aria-live polite region with the soonest event', async () => {
    // 2026-11-16 07:15 IST: 33 minutes to Navkarshi (07:48)
    const fixedNow = 1794793500000;
    const clock = { now: () => fixedNow, nowMs: () => fixedNow };
    const service = createMockSnapshotService();

    root = createRoot(container);
    await act(async () => {
      root!.render(<FoundationHome clock={clock} snapshotService={service} />);
    });

    const politeRegion = container.querySelector('[aria-live="polite"]');
    expect(politeRegion).not.toBeNull();
    expect(politeRegion?.textContent).toBe('Navkarshi in 33 minutes');
  });

  it('foundation home renders simulated time banner when clock is simulated', async () => {
    const fixedNow = 1794793500000; // 07:15 IST
    const clock = { now: () => fixedNow, nowMs: () => fixedNow };
    const service = createMockSnapshotService();

    root = createRoot(container);
    await act(async () => {
      root!.render(<FoundationHome clock={clock} snapshotService={service} isSimulated={true} />);
    });

    const banner = container.querySelector('.ar-simulated-banner');
    expect(banner).not.toBeNull();
    expect(banner?.textContent).toContain('Simulated time: 07:15 IST');
  });
});
