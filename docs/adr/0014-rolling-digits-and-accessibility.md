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

## Amendment (6b)

In Prompt 6b, the rolling digit mechanics and component implementation were reworked following real-browser review:

1. **Direction and Scope Rules**:
   - The roll direction follows the change of the whole countdown value: a decrease rolls down (the old digit leaves downward, the new digit enters from above); an increase rolls up (the old digit leaves upward, the new digit enters from below); equal values do not animate.
   - Every digit whose character changes rolls in the computed direction, including wraps (9 to 0 on increment rolls up; 0 to 9 on decrement rolls down).
   - Unchanged digits, separators, and unit letters remain completely static.
   - When the slot count changes, slots align from the right; slots without previous characters only enter, while slots without next characters only exit.
2. **Keyed Glyph Elements for Animation Restart**:
   - Each changed slot mounts newly keyed DOM elements (`.ar-roll-enter` and `.ar-roll-exit` with a monotonically incrementing sequence counter) so that every change restarts CSS animations reliably in all browser engines.
   - Exiting glyphs are unmounted upon `onAnimationEnd` or by a 400ms safety timeout.
   - Synchronized dual-layer rendering in `Countdown.tsx` ensures the shade layer and clipped fill layer share identical sequence keys and animation timing.

### Root cause of the Prompt 6 defect

Analysis from code (reading pre-6b implementation at commit `f0e4903:apps/app/src/ui/RollingDigits.tsx` and `rolling-digits-model.ts`):
In the Prompt 6 implementation, slot elements in `RollingDigits.tsx` were rendered with static array index keys (`key={index}`) and static track children (`.ar-num-prev`, `.ar-num-next`). When new countdown changes arrived, React's reconciliation reconciled the existing DOM elements without re-triggering CSS keyframe animations. Furthermore, consecutive rapid updates or digit wraps (such as 0 to 9 on decrement) lacked dynamic keying, entry/exit lifecycle cleanup via `animationend`, and a safety timeout fallback, leaving exiting glyphs in the DOM and failing to restart animations reliably across browser engines.
