# Bundled Fonts Specification

## Font Selection Summary

The numerical display and editorial headers in Arunodaya require an elegant, high-contrast serif font with tabular lining figures to guarantee uniform character baselines and widths without visual jitter or layout shifting during countdown increments and rollovers.

In accordance with Prompt 6b Part C and ADR 0015:

- **Selected Serif**: **Playfair Display** (SIL Open Font License 1.1) by Claus Eggers Sørensen.
- Playfair Display provides authoritative editorial presence and includes the OpenType `lnum` (lining figures) feature. Tabular width is calibrated and stabilized via the `--ar-digit-width` custom property.

## Committed Font Assets

| File                                      | Family           | Weight | Size (bytes) | SHA-256                                                            | Licence     | Package                              | Source URL                                                   | GSUB Features                                                          |
| :---------------------------------------- | :--------------- | :----- | :----------- | :----------------------------------------------------------------- | :---------- | :----------------------------------- | :----------------------------------------------------------- | :--------------------------------------------------------------------- |
| `playfair-display-latin-400-normal.woff2` | Playfair Display | 400    | 21856        | `1fe9ad5d8b2ebd8ecb8fbd05bed1e3fdfa52dae3f1a04e1c219918442fe9394d` | SIL OFL 1.1 | `@fontsource/playfair-display@5.3.0` | `https://www.npmjs.com/package/@fontsource/playfair-display` | `calt`, `ccmp`, `dnom`, `frac`, `liga`, `lnum`, `locl`, `numr`, `rlig` |
| `playfair-display-latin-700-normal.woff2` | Playfair Display | 700    | 23224        | `28453852ea165c47b5a941be00e418402e1407002ed87507f062a1e316328fe6` | SIL OFL 1.1 | `@fontsource/playfair-display@5.3.0` | `https://www.npmjs.com/package/@fontsource/playfair-display` | `calt`, `ccmp`, `dnom`, `frac`, `liga`, `lnum`, `locl`, `numr`, `rlig` |

## UI Sans Font

In v1, user interface text uses the platform native system font stack: `system-ui, sans-serif`. On Android this renders Roboto, ensuring native responsiveness, zero bundle overhead, and system-wide font scale compliance.

## Typography Invariants

- **No Remote Fonts**: All fonts are bundled locally as static `.woff2` files served from the same origin under `apps/app/src/assets/fonts/`.
- **Serif Stack**: `--ar-font-serif: 'Playfair Display', Georgia, serif;` prioritizes bundled Playfair Display with standard system fallbacks.
- **Lining Figures and Calibrated Width**: Numerals in countdowns and time displays are styled with `.ar-num` enforcing `font-feature-settings: 'lnum' 1` and slot widths constrained by `--ar-digit-width`.
