# ADR 0017: Home Screen View-Model, Presentation, and Dialog Architecture

## Status

Accepted

## Context

The Home screen is the primary interface of Arunodaya, responsible for displaying:

- Prominent next-occurrence countdowns to solar events (Sunrise, Navkarshi, Sunset).
- Current solar arc schematic position showing the sun's journey through the daytime window.
- Date, greeting, and location context.
- Day details including twilight (civil dawn, civil dusk), golden hours (morning, evening), and solar noon.
- Live moon phase card showing current phase name, illumination, and glyph.
- Detailed modal dialogs for each solar event explaining astronomical definitions, rounding rules, accuracy, and next occurrence timings.
- Manual and automatic snapshot refresh behavior.

To maintain strict separation of concerns, complete testability, and sub-millisecond rendering performance without UI stutter, the Home screen presentation architecture requires a pure view-model decouple from React rendering.

## Decision

1. **Pure View-Model Architecture (`apps/app/src/home/home-model.ts`)**:
   - The Home view-model is a pure, side-effect-free transformation function `buildHomeModel({ snapshot, nowMs, clockFormat, locationLabel })`.
   - It takes the verified snapshot data, the current wall-clock epoch instant, user display preferences (12h/24h), and location metadata, and outputs a complete, read-only data structure.
   - All presentation formatting, status derivations, card ordering, and circular interpolations occur entirely in this pure layer.
   - React components (`Home.tsx`, `EventCard.tsx`, `SolarArc.tsx`, `EventDetailsDialog.tsx`, `DayNightIcon.tsx`, `MoonPhaseGlyph.tsx`) are purely presentational ("dumb") components with zero internal business logic or astronomical calculations.

2. **Next-Occurrence Targeting and Displayed Time**:
   - Each event card displays the formatted displayed time of its **next** occurrence (the countdown target).
   - If the next occurrence falls on a later IST civil date than the current IST civil date, a clear "Tomorrow" badge is attached.
   - The primary event card is assigned to the event with the smallest remaining duration to its next occurrence.

3. **Solar Arc Schematic Representation**:
   - The solar arc indicates the progress of the daytime cycle from sunrise to sunset.
   - It is calculated as a normalized time fraction `(nowMs - exactSunrise) / (exactSunset - exactSunrise)`, clamped to `[0, 1]`.
   - During nighttime hours (before sunrise or after sunset), the sun indicator rests at the respective horizon endpoint (0 before sunrise, 1 after sunset).
   - The arc is purely schematic and represents time progression rather than geometric celestial altitude.

4. **Event Details Dialog**:
   - Tapping an event card opens an accessible modal dialog (`Dialog.tsx` / `EventDetailsDialog.tsx`).
   - The dialog explains the astronomical definition of the event, its specific display rounding rule (e.g., ceil for sunrise, floor for sunset), accuracy notes, and next occurrence details.
   - Per invariant R7 and spec section 4.2, **no seconds** appear anywhere in the dialog or on the Home screen.

5. **Snapshot Refresh Strategy**:
   - **Manual Refresh**: A refresh button rebuilds the snapshot using the currently saved location coordinates. It never prompts for device location permissions.
   - **Automatic Refresh**: When the cached snapshot status is `expiring` (7 days or fewer remaining) or `expired`, the snapshot service triggers a background rebuild. Automatic rebuilds are throttled to at most once per 6 hours to protect battery and CPU resources.

6. **Navigation Placeholders**:
   - Location chip links to `#locations` (Locations tab).
   - Date chip links to `#forecast` (Forecast tab).

7. **Stable `data-testid` Contract**:
   - `home-screen`: Root container.
   - `location-chip`: Location label and link.
   - `date-chip`: Date label and forecast link.
   - `greeting-label`: Time-appropriate greeting.
   - `solar-arc`: Daytime progress arc.
   - `event-card-{id}`: Event cards for `sunrise`, `navkarshi`, `sunset`.
   - `moon-card`: Moon phase and illumination container.
   - `refresh-button`: Snapshot rebuild trigger.
   - `event-details-dialog`: Modal details dialog.

## Consequences

- Full testability with pure unit tests over `home-model.ts` without requiring DOM rendering.
- Zero main-thread astronomical calculation overhead during UI renders.
- Consistent, predictable accessibility across all screen readers via standard HTML dialog semantics.
