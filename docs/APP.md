# Arunodaya Web Application

This document outlines the architecture, component structure, runtime services, and styling methodology of the Arunodaya application shell (`apps/app`).

## Architecture Overview

```
apps/app/
├── index.html                   # Main production entry point with early-theme script & CSP
├── themes.html                  # Standalone theme gallery review page
├── components.html              # Standalone component gallery review page
├── public/
│   └── early-theme.js           # Synchronous IIFE executing before first paint
├── src/
│   ├── app/                     # React application shell, navigation, and screens
│   │   ├── App.tsx              # Root component with hash router listener
│   │   ├── AppShell.tsx         # Top/bottom chrome layout with TabBar
│   │   ├── TabBar.tsx           # Accessible 5-route navigation bar
│   │   ├── routes.ts            # Route definitions and URL hash parser
│   │   └── screens/
│   │       ├── FoundationHome.tsx # Live solar countdowns and greetings
│   │       └── ComingSoon.tsx   # Placeholder screen for upcoming views
│   ├── assets/
│   │   └── fonts/               # Bundled Gelasio WOFF2 serif files (SIL OFL 1.1)
│   ├── core/                    # Low-level infrastructure adapters
│   │   ├── clock.ts             # System, offset, and frozen clock implementations
│   │   ├── debug.ts             # Dev/test URL query parameter parser (?theme=, ?now=)
│   │   ├── prefs.ts             # User preferences schema and serialization
│   │   ├── storage.ts           # Abstract KeyValueStore port and LocalStorage adapter
│   │   └── theme-controller.ts  # Theme controller orchestrating CSSOM and early-paint cache
│   ├── i18n/                    # Localization and string formatting
│   │   ├── en.ts                # Plain English strings dictionary
│   │   └── index.ts             # Translation lookup, date labels, and accessible ARIA labels
│   ├── snapshot/                # Multi-day astronomy calculation pipeline
│   │   ├── client.ts            # Client wrapper with fallback and timeout guards
│   │   ├── request-handler.ts   # Pure snapshot calculation and validation
│   │   ├── service.ts           # Caching, migration, and expiration orchestrator
│   │   ├── snapshot.worker.ts   # Dedicated Web Worker entry
│   │   └── worker-protocol.ts   # Typed message definitions and type guards
│   ├── styles/                  # Global CSS styles
│   │   ├── base.css             # CSS reset, box sizing, and system defaults
│   │   └── fonts.css            # @font-face declarations for bundled Gelasio
│   ├── theme/                   # Theme application helper
│   │   └── apply-theme.ts       # CSSOM theme applier
│   ├── ui/                      # Reusable UI components and hooks
│   │   ├── Countdown.tsx        # Dual-layer accessible countdown component
│   │   ├── RollingDigits.tsx    # Odometer rolling digit renderer
│   │   ├── rolling-digits-model.ts # Direction and slot transition calculation
│   │   ├── use-now.ts           # Minute-boundary synchronized time hook
│   │   └── use-snapshot.ts      # Multi-day snapshot loading hook
│   ├── components-gallery.tsx   # Review gallery previewing countdowns across 10 themes
│   ├── main.tsx                 # Application bootstrap entry point
│   └── themes-gallery.ts        # Theme review gallery
└── tests/                       # Unit tests for components, hooks, and services
```

## Early Theme Boot Script

To eliminate flash-of-unstyled-content (FOUC) and theme flicker before React initializes:

1. `public/early-theme.js` runs synchronously in `<head>` before any stylesheet or markup.
2. It reads cached canvas and color scheme keys from `localStorage` (`arunodaya.theme.canvas`, `arunodaya.theme.mode`).
3. If present, it immediately applies `backgroundColor` and `colorScheme` to `document.documentElement.style`.
4. Falls back to CSS `prefers-color-scheme` matching when cache is missing.

## Typography & Fonts

- **Numerals & Headings**: Bundled Playfair Display Regular (400) and SemiBold (600) WOFF2 font files under `src/assets/fonts/` (SIL OFL 1.1, ADR 0015). Enforces OpenType lining figures (`lnum`) so numerals share uniform cap height and rest on the baseline. Tabular advance widths are calibrated via `--ar-digit-width` in fixed-width clipped slots. Used for headings, the greeting, event timestamps, and countdown numerals (>= 20px).
- **UI Chrome**: Standard `system-ui` sans-serif stack for small labels, badges, and tab navigation.
- **Inviolable Rule**: Georgia is strictly forbidden anywhere in font stacks due to old-style proportional numerals.

## Offline Snapshot Pipeline

Multi-day astronomical calculation is orchestrated off the main thread:

1. `useSnapshot` calls `SnapshotService.load(location)`.
2. `SnapshotService` inspects `localStorage` for a cached snapshot matching location coordinates.
3. If cache is missing, expired, or for a different location, it requests a new 92-day snapshot via `SnapshotClient`.
4. `SnapshotClient` sends a message to `snapshot.worker.ts`.
5. If Web Workers are unavailable or stuck (> 30s), `SnapshotClient` falls back seamlessly to lazy main-thread calculation via dynamic import.

## Real-Browser Tests

Real-browser automated tests execute in Chromium driven by `playwright-core` (ADR 0016):

- **Installation**: `npm run e2e:install` installs the verified Chromium browser binary to the local user cache.
- **Execution**: `npm run test:e2e` builds the production Pages target, serves it via Vite's preview server with full CSP headers, and executes the suite in `tools/tests-e2e/`.
- **Coverage**:
  - CSS keyframe animations and direction restarts verified via `element.getAnimations()`.
  - Tabular digit advance widths and slot geometry stability.
  - Font loading status via `document.fonts`.
  - Content Security Policy conformance during worker initialization.
  - Component gallery and theme switching without console or CSP errors.
- **Screenshots**: Test screenshots and visual inspection captures are written to `.scratch/e2e/` (never committed).

## Bundle Budgets

First-load JavaScript (entry chunk + modulepreloads/static imports summed as gzip) is tracked and enforced against recorded budgets:

- **Pages Target**: Budget is **165 kB gzip** (measured: ~143.3 kB gzip; budget is `ceil(measured * 1.15)`).
- **Android Target**: Budget is **165 kB gzip** (measured: ~142.7 kB gzip; budget is `ceil(measured * 1.15)`).
- **Analysis CLI**: `npm run analyze:bundle -- --target=<pages|android>` prints per-chunk raw and gzip sizes, along with the top 12 modules grouped by npm package or repository source path.
- **Astronomy Isolation**: Astronomy calculation code (`astronomy-engine` and `packages/engine/src/astro`) is isolated strictly to the worker chunk and the lazy fallback chunk (`request-handler-*.js`).

## Debug Parameters

When built with `__AR_DEBUG__` enabled (development mode and GitHub Pages targets only; disabled on Android production builds):

- `?now=YYYY-MM-DDTHH:mm`: Overrides current system time with a deterministic frozen instant.
- `?theme=<id>`: Overrides user stored theme preference with a specific theme ID or `system`.
- `?clock=12h|24h`: Forces display time format preference.
- A visual amber debug pill appears in the top-right corner of the application shell whenever debug parameters are active.
