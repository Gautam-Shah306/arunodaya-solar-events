# Bundled Fonts Specification

## Font Selection Summary

The numerical display and editorial headers in Arunodaya require tabular lining figures (`lnum` + `tnum`) on an open-licence serif to guarantee uniform character baselines and widths without visual jitter or layout shifting during countdown increments and rollovers.

In accordance with Prompt 6 Part C, candidate fonts were evaluated using the zero-dependency WOFF2 parser (`tools/lib/woff2-features.mjs`) to verify OpenType GSUB table features:

1. **`@fontsource/source-serif-4@5.3.1` (Attempt 1)**: Evaluated latin-400 and latin-600 woff2. GSUB features included `tnum`, but lacked `lnum` (lining figures are default in Source Serif 4). Lacks explicit `lnum` feature in the Fontsource Latin subset.
2. **`@fontsource-variable/source-serif-4@5.3.1` (Attempt 2)**: Evaluated variable woff2. GSUB features included `tnum`, but lacked `lnum`.
3. **`@fontsource/literata@5.3.0` (Fallback 1)**: Evaluated latin-400 and latin-600 woff2. GSUB features: `lnum: false, tnum: true`.
4. **`@fontsource/newsreader@5.3.0` (Fallback 2)**: Evaluated latin-400 and latin-600 woff2. GSUB features: `lnum: false, tnum: true`.
5. **`@fontsource/gelasio@5.3.0` (Fallback 3)**: Evaluated latin-400 and latin-600 woff2. Both weights contain both `lnum` and `tnum` OpenType GSUB features. Both files are under 25 KB, well below the 200 KB ceiling.

**Selected Serif**: **Gelasio** (SIL Open Font License 1.1).

## Committed Font Assets

| File                             | Family  | Weight | Size (bytes) | SHA-256                                                            | Licence     | Package                     | Source URL                                          | GSUB Features                                                          |
| :------------------------------- | :------ | :----- | :----------- | :----------------------------------------------------------------- | :---------- | :-------------------------- | :-------------------------------------------------- | :--------------------------------------------------------------------- |
| `gelasio-latin-400-normal.woff2` | Gelasio | 400    | 19536        | `68e2b704c5624ba84e70d826e33c5fc08d75eb452f834d869abdecc39f3b26ac` | SIL OFL 1.1 | `@fontsource/gelasio@5.3.0` | `https://www.npmjs.com/package/@fontsource/gelasio` | `ccmp`, `dnom`, `frac`, `liga`, `lnum`, `locl`, `numr`, `pnum`, `tnum` |
| `gelasio-latin-600-normal.woff2` | Gelasio | 600    | 20440        | `e504d14fb4c655a6b0cbdd2d75e9979dd6331bd3e49f00aabc125c814e1636ca` | SIL OFL 1.1 | `@fontsource/gelasio@5.3.0` | `https://www.npmjs.com/package/@fontsource/gelasio` | `ccmp`, `dnom`, `frac`, `liga`, `lnum`, `locl`, `numr`, `pnum`, `tnum` |

## UI Sans Font

In v1, user interface text uses the platform native system font stack: `system-ui, sans-serif`. On Android this renders Roboto, ensuring native responsiveness, zero bundle overhead, and system-wide font scale compliance.

## Typography Invariants

- **No Remote Fonts**: All fonts are bundled locally as static `.woff2` files served from the same origin under `apps/app/src/assets/fonts/`.
- **No Georgia**: Georgia is strictly prohibited in any font stack due to non-uniform old-style figures and lack of native availability on Android.
- **Lining and Tabular Figures**: Numerals in countdowns and time displays are styled with `.ar-num` enforcing `font-variant-numeric: lining-nums tabular-nums` and `font-feature-settings: 'lnum' 1, 'tnum' 1`.
