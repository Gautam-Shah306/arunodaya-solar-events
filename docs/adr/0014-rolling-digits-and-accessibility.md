# ADR 0014: Rolling Digits Odometer and Accessible Countdown Architecture

## Status

Accepted

## Context

Arunodaya features prominent real-time countdowns to significant solar events (Sunrise, Navkarshi, Sunset). These timers tick every minute and require visual elegance, mechanical clarity, and full accessibility for assistive technology users.

Key requirements:

- Visual odometer feel without character shifting or layout jitter.
- Accessible announcement mechanism that avoids noisy second-by-second aria spam.
- Strict WCAG 2.1 AA compliance with support for `prefers-reduced-motion`.

## Decision

1. **Directional Semantics**:
   - Rolling direction reflects the delta of the total remaining minutes value:
     - **Decrease (time elapsing)**: Rolls **down** with the new incoming digit entering from above.
     - **Increase (seeking forward or simulated time shift)**: Rolls **up** with the new incoming digit entering from below.
     - **Equal / Initial state**: No animation occurs.

2. **Slot Decomposition and Separation**:
   - Countdown strings follow the fixed format `HHh MMm` (7 character slots).
   - Only numeric digit characters (`0-9`) that actually change between ticks trigger rolling animations.
   - Separator characters (spaces, `'h'`, `'m'`) and unchanging digits remain completely static.
   - Each digit slot occupies a fixed width (`1ch`) within a clipped viewport (`overflow: hidden; height: 1.15em`).

3. **Progress Fill Rendering via Stacked Dual Layers**:
   - Countdown progress is rendered using two identically positioned text layers:
     - **Shade Base Layer**: Rendered in `--ar-countdown-shade` (tertiary text color).
     - **Fill Top Layer**: Rendered in `--ar-countdown-fill` (accent/solar color), clipped horizontally via `clip-path: inset(0 calc(100% - var(--ar-progress) * 100%) 0 0)`.
   - Both visual layers are marked `aria-hidden="true"` so assistive technologies never encounter fragmented or duplicate text nodes.

4. **Accessibility & Screen Reader Live Regions**:
   - A single visually hidden element (`.ar-sr-only`) provides the complete human-readable announcement (e.g. `"Navkarshi in 2 hours 48 minutes"`).
   - An `aria-live="polite"` live region announces the soonest upcoming event at minute boundaries, avoiding repetitive interruption while keeping screen-reader users informed.

5. **Reduced Motion**:
   - When the user prefers reduced motion (`@media (prefers-reduced-motion: reduce)`), rolling animations are disabled (`animation: none; transform: none;`), transitioning digits instantly without motion.

## Consequences

- Countdowns convey passage of time intuitively through physical odometer metaphors.
- Screen readers receive clean, intelligible, and non-intrusive updates.
- Zero layout shifting or horizontal wobble across all ten themes.
