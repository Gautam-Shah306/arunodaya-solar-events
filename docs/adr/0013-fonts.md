# ADR 0013: Typography Strategy, Serif Selection, and Bundled Fonts

## Status

Accepted

## Context

Arunodaya presents live solar event countdowns and astronomical timetables. Visual stability and precision are paramount:

- Tabular figures (`tnum`) ensure every digit has an identical horizontal advance width, preventing jitter and layout shifts as digits roll.
- Lining figures (`lnum`) ensure all numerals share uniform cap-height and rest on the baseline, preventing the ascenders and descenders of old-style numerals from breaking horizontal alignment guides.
- Strict offline requirement and CSP (`font-src 'self'`) forbid any remote font loading (e.g. Google Fonts CDN).
- High visual legibility across all display densities.

## Candidate Evaluation and Fallback Protocol

Font candidates were evaluated using automated OpenType/WOFF2 binary feature inspection (`tools/lib/woff2-features.mjs`) on their subset packages:

1. **Source Serif 4** (`@fontsource/source-serif-4` and `@fontsource-variable/source-serif-4`):
   - Fontsource subsets omitted the explicit `lnum` GSUB feature tag because lining figures were built as the default glyph set.
2. **Literata** (`@fontsource/literata`):
   - Fontsource subset omitted explicit `lnum` feature tag.
3. **Newsreader** (`@fontsource/newsreader`):
   - Fontsource subset omitted explicit `lnum` feature tag.
4. **Gelasio** (`@fontsource/gelasio`):
   - Contains explicit OpenType feature tags for both `lnum` (lining figures) and `tnum` (tabular figures) in its GSUB table.
   - Designed by Eben Sorkin, inspired by Georgia but metric-compatible and distinct, released under SIL Open Font License 1.1.
   - Passed both binary inspection gates with 100% compliance.

## Decision

1. **Serif Selection**:
   - Gelasio Regular (400) and SemiBold (600) are selected for solar countdown digits, section headers, and temporal indicators.
   - Bundled locally as WOFF2 files under `apps/app/src/assets/fonts/`:
     - `gelasio-latin-400-normal.woff2` (19,536 bytes)
     - `gelasio-latin-600-normal.woff2` (20,440 bytes)
   - Font license (`LICENSE-gelasio.txt`) is preserved in the repository assets and attribution is recorded in `NOTICE`.

2. **No Remote Fonts**:
   - Zero remote network fetches. All font assets are bundled with the web application and loaded via `@font-face` declarations referencing local WOFF2 files.

3. **Sans-Serif UI Stack**:
   - All general UI text, navigation tabs, labels, and status badges use the standard native `system-ui` sans-serif stack (`system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`).

4. **Font Stack Invariants**:
   - No `Georgia` anywhere in any font stack: Georgia uses proportional old-style figures with dropping descenders (3, 4, 5, 7, 9) and floating ascenders (6, 8), which causes intolerable horizontal jitter and baseline distortion in live countdown timers.

## Consequences

- Font asset payload is capped at ~40 KB total.
- Countdown digits roll smoothly with zero character shifting or baseline misalignments.
- Completely self-contained offline typography satisfying CSP `font-src 'self'`.
