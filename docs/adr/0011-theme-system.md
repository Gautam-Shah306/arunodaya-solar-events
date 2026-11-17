# ADR 0011: Theme System Architecture and Contrast Gate

## Status

Accepted

## Context

Arunodaya presents solar and astronomical calculations with live countdowns and widgets. The visual design requires high legibility across diverse lighting environments (from direct sunlight to pitch darkness), strict offline and CSP compatibility, zero third-party UI dependencies, and deterministic accessibility compliance without runtime overhead or visual regressions.

Previous discussions explored build-time CSS generation, dynamic Android Material You extraction, and DOM-coupled styling solutions. We need a clear architectural boundary for theme definition, contrast validation, runtime application, and widget palette serialization.

## Decision

1. **Typed Data Core in `packages/themes`**:
   - Themes are pure typed data objects in `packages/themes`.
   - The package has zero runtime dependencies, no DOM globals, no system clock, and imports nothing outside itself (no imports from `@arunodaya/contracts` or `@arunodaya/engine`).
   - Exports ten themes across two families:
     - Built-in (4): `light`, `dark`, `pure-dark`, `darker`.
     - Custom Packs (6): `pack-navy`, `pack-burgundy`, `pack-aubergine`, `pack-midnight-teal`, `pack-porcelain`, `pack-sandstone`.
   - The "Match system" choice maps strictly to `light` when the system preference is light, and `pure-dark` when the system preference is dark. No user-chosen pairing is supported.

2. **No Build-Time CSS Generation or Generated CSS Files**:
   - Node cannot import extensionless TypeScript sources cleanly without bundler orchestration, and code generators introduce build-step friction without measurable runtime benefits.
   - All styling in stylesheets references `--ar-*` custom properties with standard CSS system-colour fallbacks (e.g. `var(--ar-canvas, Canvas)`, `var(--ar-text-primary, CanvasText)`).

3. **Runtime Theme Application via CSSOM**:
   - Themes are applied at runtime by setting `data-theme="<id>"` and individual CSS custom properties using CSSOM (`element.style.setProperty`), never by writing inline `style="..."` attribute strings or injecting `<style>` elements into the DOM.
   - This satisfies the strict Content Security Policy (`style-src 'self'`).
   - The early-paint inline boot script and local storage persistence will arrive in Prompt 6; the user selector UI will arrive in Prompt 8.

4. **No Android Dynamic Colour**:
   - Material You / Dynamic Colour on Android alters color palettes dynamically based on user wallpaper, which would compromise carefully tuned astronomical contrast ratios and break gold/solar accent semantic conventions. Arunodaya uses its own deterministic curated themes exclusively.

5. **Automated Contrast and Distinctness Gates**:
   - A suite of automated WCAG contrast checks runs during `npm run test:coverage`. Every theme must satisfy strict minimum ratios (7:1 for primary text on canvas/surfaces, 4.5:1 for secondary/accents/status, 3:1 for tertiary text, borders, and UI elements, and 1.8:1 for progress fill versus shade).
   - A distinctness gate verifies pairwise canvas perceptual difference ($\Delta E \ge 6$) using CIE76 in Lab color space, ensuring themes like `pack-midnight-teal` remain visibly distinct from `darker`.

6. **Widget Palettes and Android Signed 32-bit ARGB Integers**:
   - Android widgets cannot execute CSS custom properties or WebView styles.
   - Each theme provides a dedicated `WidgetPalette` of opaque `#RRGGBB` colors.
   - `packages/themes` provides a pure conversion helper `toAndroidColorInt` and `widgetPaletteToAndroid` converting hex strings to signed 32-bit ARGB integers (`0xFFRRGGBB | 0`), ready for Jetpack Glance / RemoteViews consumption in Prompt 11.

## Consequences

- All colour values and hex codes are strictly quarantined inside `packages/themes`.
- Web application stylesheets remain lightweight, static, and declarative.
- Visual accessibility is guarded by automated CI tests rather than manual verification.

## Amendment (6b)

In Prompt 6b, the theme lineup and design tokens were refined based on design review and accessibility gates:

1. **Eight Themes Lineup**:
   - `pack-aubergine` and `pack-midnight-teal` are removed. The finalized lineup consists of eight themes: `light`, `dark`, `pure-dark`, `darker`, `pack-navy`, `pack-burgundy`, `pack-porcelain`, and `pack-sandstone`.
   - Stored selections of removed theme IDs cleanly fall back to `system` (Match system).
2. **Pure Dark Hierarchy**:
   - In `pure-dark`, `layer1`, `layer2`, and `layer3` equal the canvas (`#000000`). Visual separation is provided by `border` and `borderStrong`.
   - Pure dark widgets use black surface and surfaceAlt.
3. **Deeper Dark Palettes**:
   - `darker`, `pack-navy`, and `pack-burgundy` use deeper, more saturated canvas anchors with lightness below 0.10.
4. **Light Theme Widgets**:
   - Light themes (`light`, `pack-porcelain`, `pack-sandstone`) feature light widgets matching the theme base mode, utilizing `layer1` as widget surface and dark text for high contrast.
5. **Border Contrast Check**:
   - Added contrast check `border-canvas` (minimum 1.3:1 ratio) ensuring structural borders and cards remain perceptible against the canvas across all themes, expanding the automated contrast specification to 46 check IDs.
