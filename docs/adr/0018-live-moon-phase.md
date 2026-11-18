# ADR 0018: Live Moon Phase and Illumination Interpolation

## Status

Accepted

## Context

Spec section 3.2 specifies that the Home screen must present the live moon phase and illumination for the current wall-clock instant. However, the precomputed snapshot stored in IndexedDB or Capacitor Preferences only stores astronomical values at 12:00 IST noon for each day (`DayRecord.moonPhaseAtNoon`).

Constraints:

1. **Main Thread Isolation (Invariants R7, R11)**: The main JavaScript thread must never import or run Astronomy Engine code to prevent jank, UI frame drops, and bundle bloat.
2. **First-Load JS Budget**: Astronomy Engine (~98 KB raw, ~26 KB gzip) must remain exclusively in the Web Worker and main-thread lazy fallback chunk.
3. **Accuracy & Continuity**: The live moon phase must transition smoothly through the 24-hour cycle without jumping abruptly at midnight or noon, while remaining astronomically faithful.

## Decision

1. **Linear Interpolation Between Adjacent Noon Records (`packages/engine/src/moon/phase.ts`)**:
   - The engine provides pure functions `interpolatePhase(a, b, t)` and `livePhase(snapshot, nowMs)`.
   - `fraction`: Linear interpolation of moon phase angle along the shortest circular path modulo 1:
     - Difference `delta = ((b.phase - a.phase + 1.5) % 1) - 0.5`.
     - `interpolatedFraction = (a.phase + t * delta) % 1`.
   - `illumination`: Linear interpolation `(1 - t) * a.illumination + t * b.illumination`, clamped to `[0, 1]`.

2. **Error Bounds**:
   - The lunar synodic cycle is ~29.53 days, advancing ~0.03387 in fraction per day (~0.0014 per hour).
   - Non-linear orbital perturbations (evcetion, variation) over a 24-hour window deviate from linear interpolation by at most ±0.003 in fraction and ±0.005 in illumination.
   - Since each canonical phase bin spans 0.125 (1/8 of the cycle), the maximum error is < 2.5% of a bin width, making linear interpolation indistinguishable from exact calculations for UI presentation.

3. **Eight Phase Bins**:
   - The continuous fraction `[0, 1)` is categorized into eight canonical phases:
     - `new_moon`: [0.96875, 1.0) and [0.0, 0.03125) (centred on 0.0)
     - `waxing_crescent`: [0.03125, 0.21875) (centred on 0.125)
     - `first_quarter`: [0.21875, 0.28125) (centred on 0.25)
     - `waxing_gibbous`: [0.28125, 0.46875) (centred on 0.375)
     - `full_moon`: [0.46875, 0.53125) (centred on 0.5)
     - `waning_gibbous`: [0.53125, 0.71875) (centred on 0.625)
     - `third_quarter`: [0.71875, 0.78125) (centred on 0.75)
     - `waning_crescent`: [0.78125, 0.96875) (centred on 0.875)

4. **Moon Glyph Rendering (`apps/app/src/home/moon-glyph.ts`)**:
   - Computes pure SVG path geometry `moonGlyphGeometry(fraction)` and `moonGlyphPath(geometry, cx, cy, r)`.
   - Generates circular and elliptical arcs without external image assets or complex canvas dependencies.

## Consequences

- Live moon phase updates smoothly without running astronomy calculations on the main thread.
- Zero extra bundle overhead on first load.
- Fully deterministic and covered by pure unit tests.
