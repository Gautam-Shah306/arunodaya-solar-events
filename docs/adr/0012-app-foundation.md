# ADR 0012: Application Foundation Architecture and State Strategy

## Status

Accepted

## Context

Arunodaya requires an application shell for web and Android targets that renders daily astronomical countdowns, handles user preferences, and coordinates computation without performance regressions, layout shifts, or supply-chain inflation.

Key constraints:

- Zero telemetry, zero analytics, zero external network requests (strict CSP).
- Instantaneous initial paint without theme flash.
- Lightweight and auditable toolchain with minimal surface.
- High-precision live timers ticking strictly at wall-clock minute boundaries.

## Decision

1. **Framework & Bundler**:
   - React 19 with TypeScript and Vite.
   - Vite builds targeted bundles for both GitHub Pages (`base: '/arunodaya-solar-events/'`) and Android Capacitor WebView (`base: './'`).

2. **Styling Strategy**:
   - Plain CSS utilizing CSS custom properties (`--ar-*`) defined in `@arunodaya/themes`.
   - Tailwind CSS is intentionally omitted in v1: the application design tokens are already encapsulated in CSS custom properties, and adding Tailwind would expand build toolchain surface, require additional postcss plugins, and complicate CSP compliance without architectural benefit. Revisit only if CSS maintenance becomes unmanageable.

3. **State Management**:
   - No external state management library (Redux, Zustand, MobX).
   - Core application state is maintained via lightweight custom React hooks (`useNow`, `useSnapshot`) and modular pure TypeScript controllers (`theme-controller`, `prefs`, `storage`).

4. **Persistence & Storage Port**:
   - Abstract `KeyValueStore` interface with `get`, `set`, and `remove`.
   - V1 ships with a synchronous `localStorage` adapter (`createLocalStorageStore`) equipped with error resilience (gracefully handling missing storage, private browsing restrictions, and quota exhaustion).
   - Storage volume is modest: user preferences (< 1 KB) and cached multi-day snapshot (~120 KB).
   - The same port can be backed by IndexedDB or an Android native bridge adapter in future prompts if needed. The widget store remains separate.

5. **Client-Side Routing**:
   - Simple hash-based routing (`#/`, `#/forecast`, `#/astronomy`, `#/locations`, `#/settings`).
   - Hash routing avoids server rewrite configuration across static hosting (GitHub Pages) and local Android `file://` / `capacitor://` web view environments.

6. **Typography**:
   - UI chrome and labels use standard `system-ui` sans-serif font stack.
   - Numerical countdowns and solar headers use bundled serif with lining tabular figures (ADR 0013).

7. **Developer & Debug Features**:
   - URL debug parameters (`?theme=`, `?now=`, `?freeze=1`) are compiled and active only when `__AR_DEBUG__` is true (GitHub Pages and local Vite dev server).
   - In production Android builds, `__AR_DEBUG__` is false and debug parsing is dead-code eliminated.

8. **Temporary Default Location**:
   - Default location is fixed to Rajkot, Gujarat (`lat: 22.3, lon: 70.8`) until Prompt 8 introduces interactive GPS and offline Indian city selection.

## Consequences

- Clean separation between pure computation, storage, and UI presentation.
- Extremely low JavaScript bundle overhead.
- No client-side hydration mismatch or routing configuration dependencies on hosting servers.
