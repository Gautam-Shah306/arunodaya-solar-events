import React from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './app/App.js';
import {
  createFrozenClock,
  createOffsetClock,
  createSystemClock,
  type Clock,
} from './core/clock.js';
import { parseDebugParams } from './core/debug.js';
import { createLocalStorageStore } from './core/storage.js';
import { createThemeController } from './core/theme-controller.js';
import { createSnapshotClient } from './snapshot/client.js';
import { createSnapshotService } from './snapshot/service.js';

import './styles/fonts.css';
import './styles/base.css';

function init(): void {
  const store = createLocalStorageStore();

  // Debug parameters parsing (only active when __AR_DEBUG__ is true)
  const isDebug = typeof __AR_DEBUG__ !== 'undefined' && __AR_DEBUG__;
  const debugParams = parseDebugParams(
    typeof window !== 'undefined' ? window.location.search : '',
    isDebug,
  );

  // Initialize theme controller with early paint support
  createThemeController({
    store,
    env: {
      root: document.documentElement,
      setMetaThemeColor: (color) => {
        let meta = document.querySelector('meta[name="theme-color"]');
        if (!meta) {
          meta = document.createElement('meta');
          meta.setAttribute('name', 'theme-color');
          document.head.appendChild(meta);
        }
        meta.setAttribute('content', color);
      },
      prefersDark: () =>
        typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches,
      onPrefersDarkChange: (cb) => {
        if (typeof window === 'undefined') return () => {};
        const mql = window.matchMedia('(prefers-color-scheme: dark)');
        const listener = () => {
          cb();
        };
        mql.addEventListener('change', listener);
        return () => {
          mql.removeEventListener('change', listener);
        };
      },
    },
    debugOverride: debugParams.themeId,
  });

  // Clock initialization (supports simulated or frozen time in debug mode)
  let clock: Clock;
  let isSimulated = false;

  if (isDebug && debugParams.nowMs !== undefined) {
    isSimulated = true;
    clock = debugParams.freeze
      ? createFrozenClock(debugParams.nowMs)
      : createOffsetClock(createSystemClock(), debugParams.nowMs);
  } else {
    clock = createSystemClock();
  }

  // Snapshot background worker client and caching service
  const client = createSnapshotClient();
  const snapshotService = createSnapshotService({
    store,
    client,
    clock,
  });

  const rootElement = document.getElementById('root');
  if (rootElement) {
    const root = createRoot(rootElement);
    root.render(
      <React.StrictMode>
        <App clock={clock} snapshotService={snapshotService} isSimulated={isSimulated} />
      </React.StrictMode>,
    );
  }
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
}
