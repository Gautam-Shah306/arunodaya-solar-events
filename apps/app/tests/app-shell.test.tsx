import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { App } from '../src/app/App.js';
import { TabBar } from '../src/app/TabBar.js';
import { ComingSoon } from '../src/app/screens/ComingSoon.js';
import type { SnapshotService } from '../src/snapshot/service.js';
import type { DayRecord, SnapshotV1 } from '@arunodaya/contracts';

const fixedNowMs = 1794767400000; // 2026-11-16T18:30:00Z = 2026-11-17T00:00:00 IST

const MOCK_DAY: DayRecord = {
  istDate: '2026-11-17',
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

const dummySnapshot: SnapshotV1 = {
  schemaVersion: 1,
  engine: { name: 'astronomy-engine', version: '2.1.19' },
  generatedAtMs: fixedNowMs,
  location: {
    lat: 22.3,
    lon: 70.8,
    label: 'Rajkot',
    source: 'manual',
    fixAtMs: fixedNowMs,
  },
  days: [MOCK_DAY],
  moonEvents: [],
};

const mockService: SnapshotService = {
  load: vi.fn().mockResolvedValue({
    ok: true,
    value: { source: 'cached', snapshot: dummySnapshot },
  }),
};

describe('App Shell and Navigation', () => {
  let container: HTMLDivElement | null = null;
  let root: Root | null = null;

  beforeEach(() => {
    (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    window.location.hash = '';
  });

  afterEach(() => {
    if (root) {
      act(() => {
        root!.unmount();
      });
      root = null;
    }
    if (container && container.parentNode) {
      container.parentNode.removeChild(container);
      container = null;
    }
    window.location.hash = '';
    vi.clearAllMocks();
  });

  it('renders App with home route by default', async () => {
    await act(async () => {
      root!.render(
        <App
          clock={{ now: () => fixedNowMs, nowMs: () => fixedNowMs }}
          snapshotService={mockService}
          isSimulated={false}
        />,
      );
    });

    expect(container!.querySelector('.ar-tabbar')).toBeTruthy();
    const activeItem = container!.querySelector('.ar-tabbar-item[aria-current="page"]');
    expect(activeItem).toBeTruthy();
  });

  it('navigates to settings and renders ComingSoon screen', async () => {
    window.location.hash = '#settings';

    await act(async () => {
      root!.render(
        <App
          clock={{ now: () => fixedNowMs, nowMs: () => fixedNowMs }}
          snapshotService={mockService}
          isSimulated={false}
        />,
      );
    });

    expect(container!.querySelector('.ar-coming-soon')).toBeTruthy();
    expect(container!.textContent).toContain('Settings');
  });

  it('responds to window hashchange events', async () => {
    await act(async () => {
      root!.render(
        <App
          clock={{ now: () => fixedNowMs, nowMs: () => fixedNowMs }}
          snapshotService={mockService}
          isSimulated={false}
        />,
      );
    });

    await act(async () => {
      window.location.hash = '#forecast';
      window.dispatchEvent(new HashChangeEvent('hashchange'));
    });

    expect(container!.querySelector('.ar-coming-soon')).toBeTruthy();
    expect(container!.textContent).toContain('Forecast');

    await act(async () => {
      window.location.hash = '#astronomy';
      window.dispatchEvent(new HashChangeEvent('hashchange'));
    });
    expect(container!.textContent).toContain('Astronomy');

    await act(async () => {
      window.location.hash = '#locations';
      window.dispatchEvent(new HashChangeEvent('hashchange'));
    });
    expect(container!.textContent).toContain('Locations');

    await act(async () => {
      window.location.hash = '#settings';
      window.dispatchEvent(new HashChangeEvent('hashchange'));
    });
    expect(container!.textContent).toContain('Settings');

    await act(async () => {
      window.location.hash = '#unknown-route';
      window.dispatchEvent(new HashChangeEvent('hashchange'));
    });
    expect(container!.querySelector('.ar-home')).not.toBeNull();
  });

  it('TabBar invokes onNavigate when a tab button is clicked', async () => {
    const onNavigate = vi.fn();
    await act(async () => {
      root!.render(<TabBar currentRoute="home" onNavigate={onNavigate} />);
    });

    const items = container!.querySelectorAll('.ar-tabbar-item');
    expect(items.length).toBe(5);

    await act(async () => {
      (items[1] as HTMLElement).click();
    });

    expect(onNavigate).toHaveBeenCalledWith('forecast');
  });

  it('ComingSoon renders given title and placeholder text', async () => {
    await act(async () => {
      root!.render(<ComingSoon title="Feature XYZ" />);
    });

    expect(container!.querySelector('.ar-coming-soon-title')!.textContent).toBe('Feature XYZ');
    expect(container!.textContent).toContain('Coming in a later update');
  });
});
