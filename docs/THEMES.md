# Theme System and Palette Specification

Arunodaya features a deterministic, accessibility-checked theme system defined as pure typed data in `packages/themes`. The system enforces high contrast, distinctness, restrained aesthetics, and zero third-party UI dependencies.

Visual review of all eight themes is available via the standalone review gallery: [themes.html](file:///d:/Sem4%20vac/arunodaya-solar-events/apps/app/themes.html).

---

## Token Reference

### Semantic Tokens (23 tokens)

All semantic tokens are exported as uppercase `#RRGGBB` strings (or `#RRGGBBAA` for `scrim`). In CSS stylesheets, tokens are consumed as `--ar-<kebab>` custom properties with system-colour keyword fallbacks.

| Token            | CSS Variable           | Purpose & Where Used                                                                         |
| :--------------- | :--------------------- | :------------------------------------------------------------------------------------------- |
| `canvas`         | `--ar-canvas`          | Base application background behind all content cards and chrome.                             |
| `layer1`         | `--ar-layer-1`         | Elevated card surfaces, list rows, navigation headers, and primary content containers.       |
| `layer2`         | `--ar-layer-2`         | Secondary surfaces inside cards, grouped item containers, and table headers.                 |
| `layer3`         | `--ar-layer-3`         | Tertiary inset elements, segmented control tracks, and input backgrounds.                    |
| `border`         | `--ar-border`          | Subtle dividers and separation borders between cards or adjacent content.                    |
| `borderStrong`   | `--ar-border-strong`   | High-contrast structural boundaries, active borders, and card outlines meeting 3:1 contrast. |
| `textPrimary`    | `--ar-text-primary`    | Main titles, astronomical times, headings, and primary body text meeting 7:1 (AAA).          |
| `textSecondary`  | `--ar-text-secondary`  | Secondary labels, location details, dates, and subtitle copy meeting 4.5:1 (AA).             |
| `textTertiary`   | `--ar-text-tertiary`   | Non-essential metadata, stale indicators, and auxiliary labels meeting 3:1.                  |
| `textOnAccent`   | `--ar-text-on-accent`  | High-contrast label text rendered inside accent-filled buttons and badges.                   |
| `accent`         | `--ar-accent`          | Brand interactive accent (champagne/antique gold) for buttons, toggles, and highlights.      |
| `accentText`     | `--ar-accent-text`     | Contrast-tuned gold text for standalone accent copy meeting 4.5:1.                           |
| `solar`          | `--ar-solar`           | Solar golden accent for sunrise markers, daylight bars, and solar noon indicators.           |
| `solarText`      | `--ar-solar-text`      | High-contrast solar amber text for labels and headings meeting 4.5:1.                        |
| `daySun`         | `--ar-day-sun`         | Icon stroke and fill for daytime indicators, sunrise icons, and solar progress.              |
| `nightMoon`      | `--ar-night-moon`      | Icon stroke and fill for night indicators, moonrise icons, and twilight markers.             |
| `countdownFill`  | `--ar-countdown-fill`  | Leading high-contrast fill color for rolling digits and active progress text meeting 7:1.    |
| `countdownShade` | `--ar-countdown-shade` | Muted background track color for countdown progress, meeting 3:1 on cards and 1.8:1 vs fill. |
| `focus`          | `--ar-focus`           | Keyboard accessibility focus indicator ring (blue or cyan, never gold) meeting 3:1.          |
| `positive`       | `--ar-positive`        | Status green for verified states, upcoming valid windows, and optimal conditions (4.5:1).    |
| `warning`        | `--ar-warning`         | Status amber for expiring snapshots and approximate calculation dates (4.5:1).               |
| `critical`       | `--ar-critical`        | Status red for expired snapshots, out-of-range errors, and location failures (4.5:1).        |
| `scrim`          | `--ar-scrim`           | Translucent backdrop overlay behind modals and bottom sheets (#RRGGBB99 ~60% alpha).         |

### Widget Palette Tokens (12 tokens)

Widget tokens provide opaque `#RRGGBB` colors serialized for Android AppWidgets (Glance / RemoteViews) via signed 32-bit ARGB integers.

| Widget Token     | CSS Variable                  | Purpose & Where Used                                                            |
| :--------------- | :---------------------------- | :------------------------------------------------------------------------------ |
| `surface`        | `--ar-widget-surface`         | Base widget background container surface.                                       |
| `surfaceAlt`     | `--ar-widget-surface-alt`     | Alternate elevated surface for widget event rows and section boxes.             |
| `border`         | `--ar-widget-border`          | Widget card border and row divider.                                             |
| `textPrimary`    | `--ar-widget-text-primary`    | Primary widget time numbers and event names (7:1).                              |
| `textSecondary`  | `--ar-widget-text-secondary`  | Secondary widget labels, date strings, and location names (4.5:1).              |
| `accent`         | `--ar-widget-accent`          | Widget highlight accents and button tinting.                                    |
| `solar`          | `--ar-widget-solar`           | Widget solar marker color meeting 4.5:1 on widget surface.                      |
| `countdownFill`  | `--ar-widget-countdown-fill`  | Widget countdown primary text and progress indicator (7:1).                     |
| `countdownShade` | `--ar-widget-countdown-shade` | Widget countdown progress track shade meeting 3:1 on surface and 1.8:1 vs fill. |
| `day`            | `--ar-widget-day`             | Widget day phase indicator dot or icon.                                         |
| `night`          | `--ar-widget-night`           | Widget night phase indicator dot or icon.                                       |
| `stale`          | `--ar-widget-stale`           | Stale warning timestamp and approximation indicator (4.5:1).                    |

---

## Usage Rules

1. **Strict No-Literals Rule (R9)**: No hex, rgb, hsl, or named color literals may exist in `apps/app` or any package outside `packages/themes`. All UI styling must consume `--ar-*` custom properties with standard CSS system-colour keyword fallbacks (e.g. `var(--ar-canvas, Canvas)`).
2. **Runtime Application via CSSOM**: Themes are applied strictly through CSSOM (`element.style.setProperty`). Inline `style="..."` attribute strings and `<style>` injection are forbidden by CSP (`style-src 'self'`).
3. **Tertiary Text Constraint**: `textTertiary` is restricted to non-essential metadata, auxiliary captions, or text styled at $\ge 18\text{pt}$ / $24\text{px}$. Critical operational info, countdown digits, and event times must use `textPrimary` or `textSecondary`.
4. **Gold Hue Integrity**: Every theme's `accent` and `solar` tokens must maintain a perceived gold/amber hue in the range of $[30^\circ, 52^\circ]$. Pure Dark uses pure black `#000000` canvas and pure white `#FFFFFF` text. Focus rings must use high-visibility blue or cyan, never gold.

---

## The Eight Themes

The eight themes are curated across two families: Built-in (4) and Custom Packs (4).

| ID               | Name      | Family     | Base Mode | Character                                               | Anchor Colours (Canvas, Layer1, TextPrimary, Accent, Solar) |
| :--------------- | :-------- | :--------- | :-------- | :------------------------------------------------------ | :---------------------------------------------------------- |
| `light`          | Light     | `built_in` | `light`   | Editorial Premium with sage layers and deep forest ink  | `#F7F2E7`, `#FFFCF5`, `#14301F`, `#8C6417`, `#A9741A`       |
| `dark`           | Dark      | `built_in` | `dark`    | Restrained charcoal-green with warm parchment text      | `#14211A`, `#1C2B22`, `#EFE6D2`, `#D8B96C`, `#E3B75A`       |
| `pure-dark`      | Pure Dark | `built_in` | `dark`    | OLED absolute black `#000000` with pure black layers    | `#000000`, `#000000`, `#FFFFFF`, `#D8B96C`, `#E3B75A`       |
| `darker`         | Darker    | `built_in` | `dark`    | Deep atmospheric forest green, darker than dark         | `#04170C`, `#082212`, `#EAE0CB`, `#D8B96C`, `#E3B75A`       |
| `pack-navy`      | Navy      | `pack`     | `dark`    | Deep maritime midnight blue with ivory accents          | `#050C24`, `#091838`, `#F1EBDD`, `#D8B96C`, `#E3B75A`       |
| `pack-burgundy`  | Burgundy  | `pack`     | `dark`    | Rich velvet wine tone with warm ivory typography        | `#14050A`, `#230912`, `#F3E8DA`, `#D8B96C`, `#E3B75A`       |
| `pack-porcelain` | Porcelain | `pack`     | `light`   | Cool architectural off-white with deep navy ink text    | `#F2F5F8`, `#FFFFFF`, `#0F2238`, `#82580F`, `#9C660F`       |
| `pack-sandstone` | Sandstone | `pack`     | `light`   | Warm desert sand with espresso ink and terracotta tones | `#F2E3C6`, `#FAF1DE`, `#2E1D12`, `#85540B`, `#9E6114`       |

---

## Contrast Checks Table

The theme contrast gate evaluates 46 automated checks across every theme during `npm run test:coverage`.

| Check ID                            | Foreground       | Background       | Scope    | Min Ratio | Purpose                                                                       |
| :---------------------------------- | :--------------- | :--------------- | :------- | :-------- | :---------------------------------------------------------------------------- |
| `text-primary-canvas`               | `textPrimary`    | `canvas`         | `tokens` | 7.0:1     | Primary text readability on canvas (WCAG AAA level)                           |
| `text-primary-layer1`               | `textPrimary`    | `layer1`         | `tokens` | 7.0:1     | Primary text readability on layer 1 cards (WCAG AAA level)                    |
| `text-primary-layer2`               | `textPrimary`    | `layer2`         | `tokens` | 4.5:1     | Primary text readability on layer 2 surfaces (WCAG AA level)                  |
| `text-primary-layer3`               | `textPrimary`    | `layer3`         | `tokens` | 4.5:1     | Primary text readability on layer 3 surfaces (WCAG AA level)                  |
| `text-secondary-canvas`             | `textSecondary`  | `canvas`         | `tokens` | 4.5:1     | Secondary text readability on canvas (WCAG AA level)                          |
| `text-secondary-layer1`             | `textSecondary`  | `layer1`         | `tokens` | 4.5:1     | Secondary text readability on layer 1 cards (WCAG AA level)                   |
| `text-secondary-layer2`             | `textSecondary`  | `layer2`         | `tokens` | 4.5:1     | Secondary text readability on layer 2 surfaces (WCAG AA level)                |
| `text-secondary-layer3`             | `textSecondary`  | `layer3`         | `tokens` | 4.5:1     | Secondary text readability on layer 3 surfaces (WCAG AA level)                |
| `text-tertiary-canvas`              | `textTertiary`   | `canvas`         | `tokens` | 3.0:1     | Tertiary text readability on canvas (large or non-essential text only)        |
| `text-tertiary-layer1`              | `textTertiary`   | `layer1`         | `tokens` | 3.0:1     | Tertiary text readability on layer 1 cards (large or non-essential text only) |
| `accent-text-canvas`                | `accentText`     | `canvas`         | `tokens` | 4.5:1     | Accent text readability on canvas                                             |
| `accent-text-layer1`                | `accentText`     | `layer1`         | `tokens` | 4.5:1     | Accent text readability on layer 1 cards                                      |
| `solar-text-canvas`                 | `solarText`      | `canvas`         | `tokens` | 4.5:1     | Solar text readability on canvas                                              |
| `solar-text-layer1`                 | `solarText`      | `layer1`         | `tokens` | 4.5:1     | Solar text readability on layer 1 cards                                       |
| `text-on-accent-accent`             | `textOnAccent`   | `accent`         | `tokens` | 4.5:1     | Text readability on accent-filled interactive controls                        |
| `accent-canvas`                     | `accent`         | `canvas`         | `tokens` | 3.0:1     | Accent component and icon visibility against canvas                           |
| `solar-canvas`                      | `solar`          | `canvas`         | `tokens` | 3.0:1     | Solar accent visibility against canvas                                        |
| `border-canvas`                     | `border`         | `canvas`         | `tokens` | 1.3:1     | Separators and card edges are perceptible against canvas                      |
| `border-strong-canvas`              | `borderStrong`   | `canvas`         | `tokens` | 3.0:1     | Strong border and divider visibility against canvas                           |
| `border-strong-layer1`              | `borderStrong`   | `layer1`         | `tokens` | 3.0:1     | Strong border and divider visibility against layer 1                          |
| `focus-canvas`                      | `focus`          | `canvas`         | `tokens` | 3.0:1     | Focus outline visibility against canvas                                       |
| `focus-layer1`                      | `focus`          | `layer1`         | `tokens` | 3.0:1     | Focus outline visibility against layer 1                                      |
| `focus-layer2`                      | `focus`          | `layer2`         | `tokens` | 3.0:1     | Focus outline visibility against layer 2                                      |
| `day-sun-layer1`                    | `daySun`         | `layer1`         | `tokens` | 3.0:1     | Day sun icon visibility against layer 1 card background                       |
| `night-moon-layer1`                 | `nightMoon`      | `layer1`         | `tokens` | 3.0:1     | Night moon icon visibility against layer 1 card background                    |
| `countdown-fill-layer1`             | `countdownFill`  | `layer1`         | `tokens` | 7.0:1     | Countdown fill prominence on layer 1                                          |
| `countdown-shade-layer1`            | `countdownShade` | `layer1`         | `tokens` | 3.0:1     | Countdown track shade visibility on layer 1                                   |
| `countdown-fill-vs-shade`           | `countdownFill`  | `countdownShade` | `tokens` | 1.8:1     | Countdown progress fill perceptible separation from track shade               |
| `positive-canvas`                   | `positive`       | `canvas`         | `tokens` | 4.5:1     | Positive status indicator readability on canvas                               |
| `positive-layer1`                   | `positive`       | `layer1`         | `tokens` | 4.5:1     | Positive status indicator readability on layer 1 cards                        |
| `warning-canvas`                    | `warning`        | `canvas`         | `tokens` | 4.5:1     | Warning status indicator readability on canvas                                |
| `warning-layer1`                    | `warning`        | `layer1`         | `tokens` | 4.5:1     | Warning status indicator readability on layer 1 cards                         |
| `critical-canvas`                   | `critical`       | `canvas`         | `tokens` | 4.5:1     | Critical status indicator readability on canvas                               |
| `critical-layer1`                   | `critical`       | `layer1`         | `tokens` | 4.5:1     | Critical status indicator readability on layer 1 cards                        |
| `widget-text-primary-surface`       | `textPrimary`    | `surface`        | `widget` | 7.0:1     | Widget primary text readability on base surface                               |
| `widget-text-primary-surface-alt`   | `textPrimary`    | `surfaceAlt`     | `widget` | 4.5:1     | Widget primary text readability on alternate surface                          |
| `widget-text-secondary-surface`     | `textSecondary`  | `surface`        | `widget` | 4.5:1     | Widget secondary text readability on base surface                             |
| `widget-text-secondary-surface-alt` | `textSecondary`  | `surfaceAlt`     | `widget` | 4.5:1     | Widget secondary text readability on alternate surface                        |
| `widget-accent-surface`             | `accent`         | `surface`        | `widget` | 3.0:1     | Widget accent element visibility on surface                                   |
| `widget-solar-surface`              | `solar`          | `surface`        | `widget` | 4.5:1     | Widget solar accent readability on surface                                    |
| `widget-countdown-fill-surface`     | `countdownFill`  | `surface`        | `widget` | 7.0:1     | Widget countdown fill prominence on surface                                   |
| `widget-countdown-shade-surface`    | `countdownShade` | `surface`        | `widget` | 3.0:1     | Widget countdown track shade visibility on surface                            |
| `widget-fill-vs-shade`              | `countdownFill`  | `countdownShade` | `widget` | 1.8:1     | Widget countdown fill perceptible separation from shade                       |
| `widget-day-surface`                | `day`            | `surface`        | `widget` | 3.0:1     | Widget day status indicator visibility on surface                             |
| `widget-night-surface`              | `night`          | `surface`        | `widget` | 3.0:1     | Widget night status indicator visibility on surface                           |
| `widget-stale-surface`              | `stale`          | `surface`        | `widget` | 4.5:1     | Widget stale marker readability on surface                                    |

---

## Distinctness Rules

- **Pairwise Canvas Distinctness**: All eight theme canvases must have pairwise perceptual distance $\Delta E \ge 4.0$ under CIE76 (D65 standard illuminant).
- **Layer Stepping**: Within every theme, adjacent elevation layers must differ by $\Delta E \ge 2.0$ (except `pure-dark` where layers are pure black `#000000` separated by border).

---

## Match System Rule

The `Match system` setting maps the operating system preference strictly as follows:

- System Light Mode $\rightarrow$ `light` (Editorial Premium)
- System Dark Mode $\rightarrow$ `pure-dark` (Pure Dark OLED)

No user-chosen custom pair is permitted, preserving deterministic rendering.

---

## Tuning Log

The following tokens were tuned from their initial starting anchors to satisfy the contrast and distinctness gates:

1. **`light`**:
   - `widget.surface` and `widget.surfaceAlt`: use light surfaces (`#FFFCF5`, `#EDF0E2`) matching `layer1` and `layer2`.
   - `widget.textPrimary` (`#14301F`) and `widget.textSecondary` (`#354E3D`) meet AAA/AA contrast against light widget surface.
   - `widget.accent` (`#73500C`) and `widget.solar` (`#734D09`) provide high-contrast gold meeting AA text contrast.
   - `widget.countdownShade`: `#809183` (meets 3:1 on surface and 1.8:1 vs `countdownFill` `#14301F`).
2. **`dark`**:
   - `canvas`: `#14211A`, with layers stepping `#1C2B22`, `#23342B`, `#2C3E34`.
   - `tokens.countdownShade` and `widget.countdownShade`: `#5E7A6B` (contrast 3.15, satisfying $\ge 3.0:1$).
3. **`pure-dark`**:
   - `canvas`, `layer1`, `layer2`, `layer3`: set to pure black `#000000`. Separation is maintained via border `#2A2A2A` (ratio $\ge 1.3:1$ on canvas).
   - `widget.surface` and `widget.surfaceAlt`: set to `#000000`.
4. **`darker`**:
   - `canvas`: `#04170C`, with layers stepping `#082212`, `#0D2E1B`, `#133B25`, and `textPrimary` `#EAE0CB`.
   - `widget.surface`: `#082212`, `widget.surfaceAlt`: `#0D2E1B`.
5. **`pack-navy`**:
   - `canvas`: `#050C24`, with layers stepping `#091838`, `#0E2250`, `#152E68`, and `textPrimary` `#F1EBDD`.
   - `widget.surface`: `#091838`, `widget.surfaceAlt`: `#0E2250`.
6. **`pack-burgundy`**:
   - `canvas`: `#14050A`, with layers stepping `#230912`, `#330F1D`, `#47172A`, and `textPrimary` `#F3E8DA`.
   - `widget.surface`: `#230912`, `widget.surfaceAlt`: `#330F1D`.
7. **`pack-porcelain`**:
   - `widget.surface` (`#FFFFFF`) and `widget.surfaceAlt` (`#E6ECF2`) provide clean light card presentation.
   - `widget.accent` (`#704B09`) and `widget.solar` (`#704705`) meet AA contrast on white surface.
   - `widget.countdownShade`: `#7C93AB` (meets 3:1 on surface and 1.8:1 vs fill `#0F2238`).
8. **`pack-sandstone`**:
   - `widget.surface` (`#FAF1DE`) and `widget.surfaceAlt` (`#E8D4B4`).
   - `widget.accent` (`#704305`) and `widget.solar` (`#704106`) meet AA contrast.
   - `widget.countdownShade`: `#8E7561` (meets 3:1 on surface and 1.8:1 vs fill `#2E1D12`).

---

## How to Add a Theme Pack

1. Create a new definition file under `packages/themes/src/themes/<theme-id>.ts` conforming to the `ThemeDefinition` interface.
2. Register the theme in `packages/themes/src/registry.ts` and add its identifier to `ThemeId` in `packages/themes/src/types.ts`.
3. Run `npm run test:coverage` to execute the automated contrast and distinctness gates.
4. Update this document (`docs/THEMES.md`) with the new theme entry and verification details.
