# Theme System and Palette Specification

Arunodaya features a deterministic, accessibility-checked theme system defined as pure typed data in `packages/themes`. The system enforces high contrast, distinctness, restrained aesthetics, and zero third-party UI dependencies.

Visual review of all ten themes is available via the standalone review gallery: [themes.html](file:///d:/Sem4%20vac/arunodaya-solar-events/apps/app/themes.html).

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

## The Ten Themes

The ten themes are curated across two families: Built-in (4) and Custom Packs (6).

| ID                   | Name          | Family     | Base Mode | Character                                                   | Anchor Colours (Canvas, Layer1, TextPrimary, Accent, Solar) |
| :------------------- | :------------ | :--------- | :-------- | :---------------------------------------------------------- | :---------------------------------------------------------- |
| `light`              | Light         | `built_in` | `light`   | Editorial Premium with sage layers and deep forest ink      | `#F7F2E7`, `#FFFCF5`, `#14301F`, `#8C6417`, `#A9741A`       |
| `dark`               | Dark          | `built_in` | `dark`    | Restrained charcoal-green with warm parchment text          | `#14211A`, `#1C2B22`, `#EFE6D2`, `#D8B96C`, `#E3B75A`       |
| `pure-dark`          | Pure Dark     | `built_in` | `dark`    | OLED absolute black `#000000` with neutral grey steps       | `#000000`, `#0D0D0D`, `#FFFFFF`, `#D8B96C`, `#E3B75A`       |
| `darker`             | Darker        | `built_in` | `dark`    | Deep atmospheric forest green, darker than dark             | `#07150E`, `#0E1E15`, `#EAE0CB`, `#D8B96C`, `#E3B75A`       |
| `pack-navy`          | Navy          | `pack`     | `dark`    | Deep maritime midnight blue with ivory accents              | `#0A1426`, `#101D36`, `#F1EBDD`, `#D8B96C`, `#E3B75A`       |
| `pack-burgundy`      | Burgundy      | `pack`     | `dark`    | Rich velvet wine tone with warm ivory typography            | `#1A0A10`, `#25111A`, `#F3E8DA`, `#D8B96C`, `#E3B75A`       |
| `pack-aubergine`     | Aubergine     | `pack`     | `dark`    | Royal imperial purple with soft lilac-ivory text            | `#150B1C`, `#1E1128`, `#EFE6F0`, `#D9B78A`, `#E3B75A`       |
| `pack-midnight-teal` | Midnight Teal | `pack`     | `dark`    | Deep petrol teal with mint typography, distinct from darker | `#052026`, `#0B2B33`, `#E3EFE6`, `#E0B45C`, `#E8B24E`       |
| `pack-porcelain`     | Porcelain     | `pack`     | `light`   | Cool architectural off-white with deep navy ink text        | `#F2F5F8`, `#FFFFFF`, `#0F2238`, `#82580F`, `#9C660F`       |
| `pack-sandstone`     | Sandstone     | `pack`     | `light`   | Warm desert sand with espresso ink and terracotta tones     | `#F2E3C6`, `#FAF1DE`, `#2E1D12`, `#85540B`, `#9E6114`       |

---

## Contrast Checks Table

The theme contrast gate evaluates 45 automated checks across every theme during `npm run test:coverage`.

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

- **Pairwise Canvas Distinctness**: All ten theme canvases must have pairwise perceptual distance $\Delta E \ge 6.0$ under CIE76 (D65 standard illuminant).
- **Midnight Teal vs Darker Green**:
  - Canvas Hue Distance: $\ge 25^\circ$ (measured $40.9^\circ$).
  - Canvas $\Delta E$: $\ge 10.0$ (measured $10.73$).
  - Layer 1 $\Delta E$: $\ge 8.0$ (measured $14.06$).
- **Layer Stepping**: Within every theme, adjacent elevation layers must differ by $\Delta E \ge 2.0$.

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
   - `widget.countdownShade`: tuned from `#567563` to `#6B8D78` (ratio against surface `#1B3A2A` improved from 2.44 to 3.26, satisfying $\ge 3.0:1$ requirement).
2. **`dark`**:
   - `canvas`: tuned from `#121A16` to `#14211A`, with layers stepping `#1C2B22`, `#23342B`, `#2C3E34` (guarantees $\Delta E \ge 6.0$ against `darker`, `pure-dark`, and `pack-midnight-teal`).
   - `tokens.countdownShade` and `widget.countdownShade`: tuned from `#566E61` to `#5E7A6B` (contrast improved from 2.88 to 3.15, satisfying $\ge 3.0:1$).
3. **`pure-dark`**:
   - `tokens.countdownShade` and `widget.countdownShade`: tuned from `#575757` to `#616161` (contrast on layer1 `#0D0D0D` improved from 2.69 to 3.14, satisfying $\ge 3.0:1$).
4. **`darker`**:
   - `canvas`: tuned from `#08110D` to `#07150E`, with layers stepping `#0E1E15`, `#15281D`, `#1C3326` (achieves $\Delta E = 8.51 \ge 6.0$ from `pure-dark` `#000000` and $\Delta E = 10.73 \ge 10.0$ from `pack-midnight-teal`).
   - `tokens.countdownShade` and `widget.countdownShade`: tuned from `#4D6756` to `#52715F` (contrast improved from 2.88 to 3.20, satisfying $\ge 3.0:1$).
5. **`pack-navy`**:
   - `tokens.countdownShade` and `widget.countdownShade`: tuned from `#4E6894` to `#526F9E` (contrast improved from 2.98 to 3.30, satisfying $\ge 3.0:1$).
6. **`pack-burgundy`**:
   - `tokens.countdownShade` and `widget.countdownShade`: tuned from `#6B4354` to `#8A576E` (contrast improved from 2.18 to 3.10, satisfying $\ge 3.0:1$).
7. **`pack-aubergine`**:
   - `tokens.countdownShade` and `widget.countdownShade`: tuned from `#624A75` to `#75588C` (contrast improved from 2.36 to 3.03, satisfying $\ge 3.0:1$).
8. **`pack-midnight-teal`**:
   - `canvas`: tuned from `#07181B` to `#052026`, with layers stepping `#0B2B33`, `#113640`, `#18424E` (satisfies $\Delta E = 10.73 \ge 10.0$ and layer1 $\Delta E = 14.06 \ge 8.0$ against `darker`).
   - `tokens.countdownShade` and `widget.countdownShade`: tuned from `#3E6F75` to `#427C87` (contrast improved from 2.91 to 3.17, satisfying $\ge 3.0:1$).
9. **`pack-porcelain`**:
   - `tokens.accent`: anchored at `#82580F` (meets 4.5:1 on layer1).
   - `tokens.countdownShade`: `#7C93AB` (contrast 3.17 on layer1).
10. **`pack-sandstone`**:
    - `canvas`: tuned from `#F4E9D8` to `#F2E3C6`, with layers `#FAF1DE`, `#E8D4B4`, `#DFC39E` (achieves $\Delta E = 6.42 \ge 6.0$ against `light` `#F7F2E7`).
    - `widget.countdownShade`: tuned from `#805E4C` to `#916B55` (contrast on surface `#3A2418` improved from 2.51 to 3.07, satisfying $\ge 3.0:1$).

---

## How to Add a Theme Pack

1. Create a new definition file under `packages/themes/src/themes/<theme-id>.ts` conforming to the `ThemeDefinition` interface.
2. Register the theme in `packages/themes/src/registry.ts` and add its identifier to `ThemeId` in `packages/themes/src/types.ts`.
3. Run `npm run test:coverage` to execute the automated contrast and distinctness gates.
4. Update this document (`docs/THEMES.md`) with the new theme entry and verification details.
