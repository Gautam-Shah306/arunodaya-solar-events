# ADR 0015: Playfair Display Serif Typography and Lining Figures

## Status

Accepted

## Context

Following product review of the Prompt 6 foundation build, the serif typeface is switched from Gelasio to Playfair Display (SIL Open Font License 1.1).

Playfair Display, designed by Claus Eggers Sørensen, is an editorial display serif influenced by late 18th-century European Enlightenment faces (Baskerville and Didone). It delivers the warm, dignified, and contemplative character desired for Arunodaya's temporal milestones and astronomical events.

However, Playfair Display presents specific typographical requirements:

1. **Old-style default figures**: Playfair Display's default numerals are proportional old-style figures (`onum`) with varying ascenders and descenders (e.g. 3, 4, 5, 7, 9 drop below the baseline). For live countdowns and tabular event lists, lining figures (`lnum`) are mandatory to ensure uniform height and a stable baseline.
2. **Tabular vs Proportional figures**: Tabular figures (`tnum`) ensure uniform advance widths across 0–9. In display fonts where `tnum` is either native or synthesized, digit advance widths must be calibrated and verified in a real browser to prevent layout jitter as countdown digits roll.
3. **Display contrast**: As a high-contrast display face with delicate hairlines, Playfair Display is calibrated specifically for large text: headings, greeting headers, event timestamps, and countdown numerals (20 px and larger). It must never be used for small labels, badges, or body text, which use native `system-ui`.

## Decision

1. **Serif Selection**:
   - Playfair Display Latin WOFF2 is bundled under `apps/app/src/assets/fonts/`:
     - Regular 400 and SemiBold 600 static weights (or variable weight font file).
     - Each font file must be under 200 KB.
   - SIL Open Font License 1.1 is preserved in `apps/app/src/assets/fonts/LICENSE-playfair-display.txt` and attributed in `NOTICE`.
2. **Mandatory Lining Figures (`lnum`)**:
   - Font files must contain the OpenType `lnum` GSUB feature tag, verified via `tools/lib/woff2-features.mjs`.
   - CSS `.ar-num` enforces `font-variant-numeric: lining-nums tabular-nums` and `font-feature-settings: 'lnum' 1, 'tnum' 1`.
3. **Calibrated Digit Slots**:
   - CSS custom property `--ar-digit-width` provides a fixed-width container slot for each rolling digit. If `tnum` is supported with equal advance widths, the slot is set to that advance width plus side bearings. If proportional lining figures are used, the slot is calibrated to the widest digit (rounded up to 0.01em) and digits are horizontally centered.
4. **Scope of Application**:
   - Headings, greeting, event times, and countdown numerals (>= 20px).
   - Small labels, body text, and tab navigation remain strictly in `system-ui`.
   - No Georgia anywhere in font stacks.

## Consequences

- Playfair Display provides refined editorial elegance while `lnum` guarantees baseline alignment.
- Zero external font requests; compliant with `font-src 'self'`.
- Real-browser end-to-end tests verify digit advance widths and font rendering in Chromium.
