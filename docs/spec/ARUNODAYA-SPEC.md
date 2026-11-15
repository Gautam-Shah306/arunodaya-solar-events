# Arunodaya — Product & Engineering Specification v2

*Revised 14 November 2026 · Supersedes the v1 consolidated record · Product/design specification, not a claim that any code, widget or calculation engine has been built.*

**Status labels:** **Decided** = explicitly requested or approved. **Proposed** = my recommendation, needs your confirmation or validation. **Open** = not yet decided.

Authoritative copy: the repository copy of this specification is authoritative from the implementation start; the Claude document is no longer updated.

---

## 0. What changed from v1

| Area | Change | Status |
| --- | --- | --- |
| Countdown targets | Countdowns target the **displayed (rounded) instant**, not the exact instant | Decided |
| Sunrise rounding | **Ceil** to the next whole minute (keeps the sunrise→Navkarshi gap at exactly 48 min on screen) | Decided |
| Countdown label | Computed from whole IST clock minutes; no separate `<1m` state | Proposed |
| Typography | Georgia dropped; bundled open-license serif with lining + tabular figures | Decided (font pick pending glyph test) |
| Widget data | Web app precomputes a 60–90 day event table; widget only looks up rows | Decided |
| Widget staleness | Absolute times lead; "as of" stamp; `≈` on stale countdowns | Decided |
| Platform | **Android only for now.** iOS out of scope | Decided |
| Language | **English only for now**, localization-ready architecture | Decided |
| Greeting | Hybrid: **04:00 and 17:00 IST, solar noon, sunset + 3 h** (fixed and solar anchors) | Decided |
| Utility extras | Date picker, monthly PDF, share card, next-moonrise countdown are **in v1** | Decided |
| Jain-specific and Panchang-style features | **Not in v1** (backlog, §16) | Decided |
| Engine | Astronomy Engine vs. SunCalc to be chosen by accuracy benchmark | Decided (benchmark pending) |
| Location | Approximate-location permission only; thresholds and out-of-India behavior defined | Decided / thresholds Proposed |
| Themes | Light, Dark, Pure Dark, Darker and curated theme packs; Match system = Light / Pure Dark (§9.2) | Decided |
| Hosting | Web build deploys to GitHub Pages through GitHub Actions (§19) | Decided |
| Source control | Git + GitHub; repository arunodaya-solar-events, not yet created (§18) | Decided |
| System design | Layered architecture, pure domain core, versioned contracts, quality gates (§17) | Decided |

---

## 1. Product identity and scope

- **Name (Decided):** Arunodaya.
- **Purpose:** A calm, elegant India-focused sunrise/sunset and daily astronomy app, with **Navkarshi** prominent, live countdowns and Android home-screen widgets.
- **Coverage (Decided):** India only. All displayed dates and times are **IST (`Asia/Kolkata`, fixed UTC+05:30)** regardless of device timezone. Because India has no daylight saving, a fixed +05:30 offset may be used internally to avoid depending on the WebView timezone database (Proposed).
- **Platform (Decided):** Android app (Capacitor shell around the shared React app) with native Android widgets. iOS and iOS widgets are out of scope for now.
- **Application ID (Decided):** in.gautam.arunodaya (permanent once published).
- **Web build (Proposed, please confirm):** The React app still builds as an installable PWA for development and for Android Chrome users, but it is a secondary channel and not a supported iOS target.
- **Minimum Android version (Open, Proposed: Android 8.0 / API 26):** Confirm against Capacitor's and Glance's current requirements at build time.
- **Language (Decided):** English only. All user-facing strings live in a resource layer so Hindi/Gujarati can be added later without refactoring. Fonts for v1 need only Latin coverage.
- **Budget (Target):** ₹0 recurring infrastructure: local calculation, local storage, no backend, no paid API, no accounts. The web build is hosted free on GitHub Pages (§19). One-time Play Console fee and any optional custom domain are outside the "recurring" definition.
- **Editorial line:** *"A little closer to the sun."*

### Principles

1. Sunrise, Navkarshi and sunset, with independent next-occurrence countdowns, come first.
2. Date, time and location context is always explicit and consistent.
3. Everything works offline for any supported date once coordinates are known.
4. Never manufacture a missing event or a precise-looking time that isn't real.
5. Android widget constraints shape the architecture from day one.
6. One visual language across all themes, screens and widgets.

---

## 2. Location behavior

### 2.1 Resolution order (Decided)

1. Fresh GPS fix, when permitted.
2. Last known/saved location.
3. Manually selected city, PIN code, or latitude/longitude.

Users can pin a fixed location instead of following GPS. The active location, its source, accuracy (when available) and last-updated time are always visible.

### 2.2 Permission (Decided)

- Request **approximate (coarse) location only**. A few kilometres of error is far below the precision that matters: roughly one minute of sunrise shift corresponds to about 25 km east–west.
- Never request background location. Permission prompts only happen in the foreground app.
- Calculation from known coordinates never requires internet.

### 2.3 Thresholds (Proposed, tune after device testing)

| Parameter | Proposed value |
| --- | --- |
| GPS fix considered fresh | Age ≤ 10 min, accuracy ≤ 5 km |
| Auto-refresh on app open | Last fix older than 6 h, or user moved > 15 km from saved point |
| "Location may be outdated" flag | Fix older than 7 days |
| Movement prompt | App open + GPS differs from saved location by > 15 km → "Update location to Mumbai?" |

### 2.4 Outside India (Proposed)

If a GPS fix falls outside India, ignore it, keep the last India location, and show a short notice that Arunodaya supports India only. Manual coordinates outside India are rejected. A simplified India boundary polygon is used for validation, not a bounding box. If a map is ever shown, Indian boundary-depiction rules apply.

### 2.5 Offline city and PIN search (Open, Proposed)

- Bundled, compressed gazetteer of Indian cities and towns (e.g. GeoNames IN, CC-BY with attribution) plus **PIN-code search** from the India Post directory on data.gov.in (check coordinate coverage and license first).
- Saved locations stored locally. Observer elevation optional per location (useful for hill stations such as Shimla or Leh).
- Remote lookup is optional and never required for core features.

---

## 3. Astronomical values and rounding

### 3.1 Required values (Decided)

Sunrise · Navkarshi · Sunset · Morning and evening golden hour · Daylight duration · Civil dawn · Civil dusk · Solar noon · Moonrise · Moonset · Moon phase · Moon illumination.

### 3.2 Definitions and conventions

- **Navkarshi:** `exactSunrise + 48 minutes` (two ghadi), computed from the exact sunrise instant, never from a rounded label.
- Sunrise/sunset are standard astronomical-horizon values, not terrain-obstructed visibility.
- **Golden hour (Proposed):** morning = sunrise to solar altitude +6°; evening = +6° to sunset. Keeping the window inside daylight avoids a "golden hour" that starts before the displayed sunrise. An optional blue-hour entry (−4° to sunrise) can sit in the Astronomy tab only.
- **Civil twilight:** sun at −6°. Nautical/astronomical twilight may appear in the Astronomy tab.
- **Moon phase and illumination reference instant (Proposed):** live value at *now* on Home; **12:00 IST** for each forecast or picked date.
- **Moon date attribution (Proposed):** a moon event is listed under the IST date on which it occurs. If a day has no moonrise or no moonset, show "No moonrise today" / "No moonset today". Never invent a time. If the paired event falls on the next IST day, show it with a `(+1)` marker.
- **Accuracy (Decided approach):** engine chosen by benchmark against NOAA/JPL Horizons reference data. Proposed tolerance to pass: sun events ±1 min, moon events ±2 min. Document that printed local calendars may differ by a minute or two because of different sunrise conventions and city tables.
- **Offline:** all calculation is local.

### 3.3 Display rounding (Decided unless noted)

| Event | Display rule |
| --- | --- |
| Sunrise | **Ceil** to next whole minute (no extra minute if already exact) |
| Navkarshi | Exact sunrise + 48 min, then **ceil** |
| Sunset | **Floor** to previous whole minute |
| Moonrise, civil dawn, golden-hour start (Proposed) | Ceil |
| Moonset, civil dusk, golden-hour end (Proposed) | Floor |
| Solar noon (Proposed) | Nearest minute |
| Daylight duration | Computed from the **displayed** sunrise and sunset so the arithmetic matches the screen |

Note: `ceil(sunrise) + 48 min = ceil(sunrise + 48 min)` always, so the on-screen sunrise→Navkarshi gap is always exactly 48 minutes.

**Exact vs. displayed instants:** every event stores both `exactMs` and `displayMs`. Exact instants are for derivation and the sun arc. Displayed instants drive countdowns, rollover and countdown-linked progress, so the timer never reaches zero before the time shown on screen.

---

## 4. Countdowns

### 4.1 Behavior (Decided)

Three independent countdowns: next **sunrise**, next **Navkarshi**, next **sunset**. Each targets the first displayed occurrence **strictly after** the current instant and rolls to the following occurrence at the exact displayed instant.

| IST time (illustrative) | Sunrise | Navkarshi | Sunset |
| --- | --- | --- | --- |
| 4:00 AM | Today | Today | Today |
| Between sunrise and Navkarshi | Tomorrow | Today | Today |
| After Navkarshi, before sunset | Tomorrow | Tomorrow | Today |
| After sunset | Tomorrow | Tomorrow | Tomorrow |

Selection always uses exact computed instants, never fixed clock cutoffs.

### 4.2 Presentation

- Format `02h 48m`. No seconds anywhere.
- **Label computation (Proposed):** `remainingMinutes = targetClockMinute − currentISTClockMinute`, where both are whole minutes. Since targets are minute-aligned, the countdown changes exactly on the wall-clock minute, always agrees with the visible clock, and the last minute reads `00h 01m` until the target minute arrives. This replaces the earlier idea of a separate `<1m` state.
- Recompute at each minute boundary while the app is in the foreground.

### 4.3 Integrated progress (Decided)

- Shown inside the countdown typography (text fill/reveal/shade), never as a separate bar.
- Fraction = elapsed share of the interval between the previous and next **displayed** occurrence of the same event, clamped to 0–1.
- Design note: because each interval is about 24 hours, all three fractions rise roughly in step through the day. This is accepted as decided. An optional additional phase indicator (sunrise→Navkarshi window) could be considered later.

### 4.4 Rolling digits (Decided)

- Digit increases → new digit enters from below, rolls upward. Digit decreases → enters from above, rolls downward.
- Fixed-width digit slots, clipped viewport, no baseline, width or card-size change.
- Respect reduced-motion; static update when animation can't run. Widgets use a static fallback.
- Screen readers receive one polite label per minute ("2 hours 48 minutes until sunset"), not per-digit changes.

### 4.5 Reference logic (corrected)

```ts
type Occurrence = { exactMs: number; displayMs: number };
const MIN = 60_000;

function displayRound(kind: 'start' | 'end' | 'nearest', exactMs: number) {
  const q = exactMs / MIN;
  return (kind === 'start' ? Math.ceil(q) : kind === 'end' ? Math.floor(q) : Math.round(q)) * MIN;
}

// occurrences sorted ascending by displayMs
function nextOccurrence(now: number, occ: Occurrence[]): Occurrence {
  const n = occ.find(o => o.displayMs > now);
  if (!n) throw new Error('Extend calculation horizon');
  return n;
}

function previousOccurrence(now: number, occ: Occurrence[]): Occurrence {
  const p = [...occ].reverse().find(o => o.displayMs <= now);
  if (!p) throw new Error('Extend calculation horizon backwards');
  return p;
}

function progress(now: number, prev: Occurrence, next: Occurrence): number {
  if (next.displayMs <= prev.displayMs) return 0;
  return Math.min(1, Math.max(0, (now - prev.displayMs) / (next.displayMs - prev.displayMs)));
}

function remainingMinutes(now: number, next: Occurrence): number {
  return Math.max(0, next.displayMs / MIN - Math.floor(now / MIN));
}
```

Compute at least the previous day, today and the next two days so previous/next occurrences resolve at midnight and at event boundaries. Navkarshi comes from its own series: `exactMs = sunriseExact + 48·MIN`, then `displayRound('start', …)`.

---

## 5. Day/night status and greeting

### 5.1 Day/night (Decided)

Day = sunrise to sunset. Night = sunset to next sunrise. Clear day/night icon in app and widgets. Twilight is extra detail in the Astronomy tab.

### 5.2 Greeting (Decided; evening length Proposed)

Greeting uses two fixed IST anchors (04:00 and 17:00) and two solar anchors at the active location (solar noon and sunset + 3 h), all evaluated in IST:

| Greeting | Window |
| --- | --- |
| Good morning | 04:00 hours → solar noon |
| Good afternoon | Solar noon → 17:00 hours |
| Good evening | 17:00 hours → sunset + 3 h (Proposed length) |
| Good night | End of evening window → next day 04:00 hours |

The hybrid keeps the morning and evening starts predictable (04:00 and 17:00) while noon and the end of the evening follow the sun. Edge case: in north-east India in winter, sunset can fall before 17:00 (about 16:30), so "Good afternoon" would run for up to roughly 40 minutes after dark. Proposed fix: evening starts at the earlier of 17:00 and sunset. Open: confirm that rule and the 3 h evening length.

---

## 6. App structure — five main sections

### 6.1 Home

Greeting · day/date (e.g. `Sat 14 November`) · active location (tap to change) · live IST clock · solar arc · sunrise/Navkarshi/sunset times · three countdowns · day/night icon · daylight duration · solar noon · golden hours · civil dawn/dusk · moonrise/moonset · moon phase/illumination · **next-moonrise countdown (see §7.4)**.

### 6.2 Forecast

Today plus six IST days: sunrise, Navkarshi, sunset, daylight, moonrise/moonset. Expand a day for golden hour, civil twilight, solar noon, moon phase/illumination. **A date picker extends this to any supported date (§7.1).**

### 6.3 Astronomy

Solar and lunar detail sections with plain-language explanations of each definition, plus the optional extra twilight and blue-hour entries.

### 6.4 Locations

GPS, last known, manual; city/PIN search; latitude/longitude entry; saved locations; accuracy and last update; permission, error and stale states.

### 6.5 Settings

12/24-hour clock · theme (match system, Light, Dark, Pure Dark, Darker, or a custom theme pack; see §9.2) · location refresh behavior · widget preferences · notifications (Android-only, types Open) · calculation information and assumptions · privacy/about · IST shown as fixed, not switchable.

### 6.6 Taps

Event or countdown → event details. Date → forecast/date picker. Location → selector. Refresh → recalculate from stored location data.

---

## 7. Utility extras (all in v1)

### 7.1 Date picker beyond seven days

- Pick any date in a supported range (Proposed: 2000–2100; shrink if the chosen engine's accuracy degrades earlier).
- A selected date shows the same day detail as the forecast: sunrise, Navkarshi, sunset, daylight, twilight, golden hours, solar noon, moon events and phase.
- Live countdowns always refer to *now*. Picked-date views are static and clearly labelled with the selected date so they are never confused with today.
- Quick actions: "Today", previous/next day, jump to month.

### 7.2 Monthly timetable PDF

- Generated entirely on device (no server), from the same engine and the same rounding rules as the app.
- Columns: date/day, sunrise, Navkarshi, sunset, daylight (optional: moonrise, moonset). Header shows month, location name (coordinates optional and off by default), "All times IST", and a one-line calculation note including the rounding rules.
- Bundled serif embedded in the PDF (no dependence on device fonts). Library to be chosen (e.g. a permissively licensed client-side PDF library; Open).
- Delivered through the Android share sheet or saved to Downloads. Designed for A4 print, e.g. for notice boards.
- Month selector with a 12-month export option (Proposed).

### 7.3 Share card (WhatsApp and others)

- Locally rendered image (canvas → PNG) in the app's editorial style: date, location **name only**, sunrise, Navkarshi, sunset, tagline. Light and dark variants.
- Shared through the generic Android share sheet, so WhatsApp, Telegram, etc. appear as targets. No WhatsApp-specific SDK or API is needed.
- Alt text and caption text provided with the image. Never includes precise coordinates by default.

### 7.4 Next-moonrise countdown

- A fourth, **secondary** countdown on Home/Astronomy only, using the same component, rolling digits and rule set as the three primary countdowns.
- Finds the next moonrise strictly after now, searching over a horizon of several days because some days have none.
- If no moonrise is found within the horizon, show a truthful empty state.
- Not included in the small or medium widgets. Optional line in the large widget (Proposed).

---

## 8. Android widgets

### 8.1 Content (Decided)

Sunrise, Navkarshi, sunset times · date/day · greeting · working refresh button · three countdowns · day/night icons · integrated text progress · no seconds · rolling digits only where the platform allows (static otherwise).

| Variant | Content |
| --- | --- |
| Small | Next event and its countdown, date/greeting, day/night |
| **Medium (primary)** | Three times, three countdowns, date/day, greeting, refresh, day/night |
| Large | Medium plus daylight, golden hours, civil twilight, moon times, phase/illumination (and optional next-moonrise) |

### 8.2 Data handoff (Decided)

The widget cannot read WebView IndexedDB. The web app writes a **precomputed snapshot** of the next 60–90 days of events as JSON through a native-readable store (Capacitor Preferences / SharedPreferences, or a small custom plugin). The widget performs lookups only: no astronomy code on the hot path. A native fallback calculator (e.g. Astronomy Engine's Kotlin port, if chosen) is needed only after the snapshot expires, with TS↔Kotlin parity tests. The snapshot is regenerated on location change, app open and settings change.

### 8.3 Refresh, staleness and reliability (Decided)

- **Absolute times lead** in the visual hierarchy. Countdowns are secondary and are prefixed with `≈` when the snapshot has not rendered for more than **20 minutes** (Proposed threshold). An "as of HH:MM" stamp is always visible.
- **Live clock:** a `TextClock` with `Asia/Kolkata` (via a RemoteViews wrapper) ticks without any scheduling.
- **Event-driven refresh:** schedule a refresh at each displayed event instant (sunrise, Navkarshi, sunset) and at IST midnight. Exact alarms need special permission on recent Android versions, so use a short `setWindow` as the fallback. Also refresh on boot and on time/timezone/date change broadcasts.
- **WorkManager** periodic work (15-minute minimum, inexact) is a maintenance fallback only, never the primary mechanism.
- **Refresh button** re-reads stored coordinates, validates, recalculates from the snapshot or fallback calculator and re-renders. It never prompts for permissions. If a fresh GPS fix is wanted it opens the app.
- **Location label** shows the place name and "set N days ago" when older than 7 days.
- **OEM guidance:** a short in-app guide for Xiaomi/Oppo/Vivo/Realme/Samsung battery and auto-start settings, since these frequently freeze widgets and background work.
- `Chronometer` can't hide seconds, so it isn't used for the countdowns. Document what is guaranteed in the foreground app vs. best effort on widgets.
- **Multiple widgets:** each widget instance can choose its own saved location through a configuration screen (Proposed).

### 8.4 Taps

Event → event details. Date → forecast. Location → selector. Refresh → recalculation.

---

## 9. Design system

### 9.1 Light theme (accepted)

Editorial Premium: warm ivory, deep forest green, muted sage, restrained antique gold, serif display, clean sans UI, generous spacing, subtle borders, minimal elevation. Widgets use a forest-green surface with ivory text and sparing gold.

### 9.2 Themes (structure Decided; palettes Open)

Arunodaya ships four built-in themes and a set of curated theme packs. Every theme shares the same layout, hierarchy and components; only the tokens change.

| Theme | Canvas | Text | Layers | Accent | Role |
| --- | --- | --- | --- | --- | --- |
| Light (Editorial Premium) | Warm ivory | Deep ink-green | Muted sage | Antique gold | Accepted direction; default for system light |
| Dark | Charcoal-green | Parchment | Olive and forest | Champagne gold | Original dark concept; selectable |
| **Pure Dark** | Black | White | Neutral near-black steps | Champagne gold | Default for system dark; saves power on OLED screens |
| **Darker** | Very dark green | Parchment | Deep green steps | Champagne gold | Keeps the green identity at the lowest brightness |
| Custom theme packs | Per pack | Per pack | Per pack | Per pack | Curated premium palettes, chosen in a selector |

- **Match system (Decided):** system light shows Light and system dark shows Pure Dark. Choosing any other theme turns Match system off. There is no user-chosen light/dark pair: Match system only ever maps to Light and Pure Dark.
- **Layers, not shadows:** on dark themes, depth comes from stepping surface lightness (canvas, layer 1, layer 2, layer 3) with subtle borders. Light keeps minimal elevation.
- **Pure Dark text (Proposed):** primary text and countdown digits are white. Secondary and tertiary text use reduced-opacity tints so the hierarchy survives on black.
- **Custom theme packs (Decided direction):** a selector offers premium packs such as Navy and Burgundy. Each pack is a complete, individually designed theme, not a recolour generated from one accent. The launch lineup is in the table below: four dark packs and two light packs, each declaring one base mode. The solar accent stays in the gold/amber family in every pack so the sun always reads the same way.
- **No free colour picker in v1 (Proposed):** curated packs only, because arbitrary colours can produce unreadable combinations.
- **Selector (Proposed):** Settings, Appearance shows the Match system switch and a gallery of theme cards. Each card previews real components (event times and a countdown), not swatches.
- **Other outputs (Proposed):** the monthly PDF uses a fixed light paper palette. The share card renders in the current theme or in Light, the user's choice. This replaces the earlier "light and dark variants" wording in §7.3.
- **Open:** exact hex values, which are designed in one token sheet and then pass the contrast gate in §9.4.

**Launch theme packs (lineup Decided; palettes Open)**

| Pack | Base | Canvas | Text | Layers | Accent and character |
| --- | --- | --- | --- | --- | --- |
| Navy | Dark | Deep midnight navy | Warm ivory | Slate-navy steps | Champagne gold; formal and classic |
| Burgundy | Dark | Deep wine | Warm ivory | Oxblood and mulberry steps | Champagne gold; rich and warm |
| Aubergine | Dark | Deep aubergine | Soft lilac-ivory | Plum steps | Champagne gold with a hint of rose; calm, evening feel |
| Midnight Teal | Dark | Deep petrol teal | Pale mint-ivory | Teal steps | Gold-amber; cool and quiet |
| Porcelain | Light | Cool off-white | Deep navy ink | Pale blue-grey steps | Bronze-gold; crisp daytime feel |
| Sandstone | Light | Warm sand | Espresso brown | Terracotta-tinted sand | Antique gold; sun-baked and earthy |

All six keep the editorial hierarchy and a gold or amber solar accent. Midnight Teal must be checked beside Darker in the selector so the two never read as the same green. Light packs need a darker gold text token to pass the contrast gate.

### 9.3 Typography (revised)

- **Numbers and headings:** a **bundled open-license serif** with lining and tabular figures. Georgia is dropped: its default numerals are old-style, it isn't installed on Android, and it can't be freely bundled. **Candidates to glyph-test:** Gelasio, Source Serif 4, Newsreader, Literata. Selection criteria: working `lnum` + `tnum`, uniform digit height and baseline, a Georgia-like warmth, and OFL or similar license. Pick after rendering real digits at actual sizes on target devices.
- **UI/body:** a clean sans. Verify the license before bundling Google Sans variants; Roboto or Inter are safe fallbacks (Open).
- **Widgets:** custom fonts in RemoteViews/Glance are unreliable, so render digits to bitmaps with a `contentDescription` for TalkBack, or use the system font if the bundled font fails to render.
- **Odometer rules:** fixed-width slots, clipped viewport, uniform baseline, no layout shift.
- **Final tokens (Open):** exact palette hex values, type scale, spacing, radii and elevation. Prototype CSS is not production tokens.
- **Accessibility:** verify gold-on-ivory and gold-on-green contrast against WCAG, test large system font scale in app and widgets, and support TalkBack and reduced motion.

### 9.4 Theme system design (Proposed unless noted)

Themes are data, not code: components read semantic tokens and never hard-code a colour.

- **Three token tiers:** a primitive palette (raw colours), semantic tokens (canvas, layer 1 to 3, text primary/secondary/tertiary, border, accent, solar, on-accent, focus, positive/warning/critical, scrim), and component tokens (countdown digit fill, progress shade, widget surface). Components use only semantic or component tokens.
- **Resolution:** a `system` choice resolves to Light or Pure Dark from the system setting. An unknown id (for example a removed pack) falls back to the system rule.
- **Applying:** the root element gets a `data-theme` attribute, CSS variables and `color-scheme`; Tailwind reads the variables. Capacitor sets the status and navigation bar style from `baseMode`. A tiny inline script reads a mirrored copy of the choice before first paint so the wrong theme never flashes.
- **Widgets:** widgets can't read CSS variables, so the resolved widget palette (about a dozen hex values) travels with the snapshot through the native-readable store (§8.2). Default is "follow app theme", with an optional separate widget theme. A theme change triggers a widget re-render.
- **Contrast gate (Decided direction):** CI computes WCAG contrast for every theme and token pair: 4.5:1 for body text, 3:1 for large text and UI components. Champagne gold must pass on every canvas; gold text on ivory is the likely failure, so Light needs a darker gold text token. A theme that fails can't merge.
- **Visual regression:** CI screenshots Home, Forecast, Settings and the widget previews in every theme.
- **Adding a pack** is one data file in the theme package plus passing both gates. No component changes.
- **Not used:** Android dynamic colour (Material You), to keep the brand palette. The Android splash screen typically follows only the system light/dark setting, so verify how it looks in each theme.

```ts
interface ThemeDefinition {
  id: string;                  // 'light' | 'dark' | 'pure-dark' | 'darker' | 'pack-navy' ...
  name: string;
  family: 'built_in' | 'pack';
  baseMode: 'light' | 'dark';  // drives color-scheme and system bar icon style
  tokens: SemanticTokens;
  widget: WidgetPalette;       // resolved hex values for native widgets
}

type ThemeChoice = { kind: 'system' } | { kind: 'theme'; id: string };

function resolveTheme(choice: ThemeChoice, systemIsDark: boolean): ThemeDefinition;
```

---

## 10. Engineering stack and data contracts

| Layer | Choice |
| --- | --- |
| App | React + TypeScript + Vite |
| Styling | Tailwind + design tokens |
| Astronomy | **Astronomy Engine** or **SunCalc**, chosen by accuracy benchmark (§12) |
| Storage | IndexedDB abstraction, plus a native-readable store for the widget snapshot |
| Android shell | Capacitor (Geolocation, Preferences, Filesystem, Share) |
| Widgets | Kotlin + Jetpack Glance (RemoteViews wrappers where needed) |
| Background | AlarmManager (event refreshes), WorkManager (fallback) |
| PDF / image | Client-side PDF library and canvas rendering (Open) |
| Offline web | Service worker + Workbox for the secondary PWA channel |
| Theming | Semantic design tokens as CSS variables; theme definitions in a shared package (§9.4) |
| Hosting (web build) | GitHub Pages, deployed by GitHub Actions (§19) |
| Source control and CI | Git + GitHub, npm workspaces monorepo, GitHub Actions (§18) |

### 10.1 Snapshot contract (Proposed)

```ts
interface Ev { exactMs: number; displayMs: number }

interface DayRecord {
  istDate: string;            // 'YYYY-MM-DD'
  sunrise: Ev; navkarshi: Ev; sunset: Ev;
  civilDawn: Ev; civilDusk: Ev;
  solarNoonMs: number;
  goldenMorning: { start: Ev; end: Ev };
  goldenEvening: { start: Ev; end: Ev };
  moonPhaseAtNoon: { phase: number; illumination: number };
}

interface SnapshotV1 {
  schemaVersion: 1;
  generatedAtMs: number;
  engine: { name: string; version: string };
  location: {
    lat: number; lon: number; elevationM?: number; label: string;
    source: 'gps' | 'last_known' | 'manual';
    fixAtMs: number; accuracyM?: number;
  };
  days: DayRecord[];                                   // previous day + 60–90 days ahead
  moonEvents: { kind: 'rise' | 'set'; ev: Ev }[];      // flat list; absent days simply have none
}
```

Exact epoch instants are stored, never display strings. A day with no moonrise or moonset simply has no corresponding entry in `moonEvents`.

### 10.2 Suggested layout

`src/{app,components,features/{home,forecast,astronomy,locations,settings,export},engine,services,hooks,types,styles}` · `public/` · `android/` (Capacitor host, Kotlin widgets, alarm and worker code) · `tests/{unit,astronomy,integration}`. Superseded by the monorepo layout in §18.3; no repository exists yet.

---

## 11. Offline, privacy and resilience

- Core features work offline once the app and coordinates exist. Anything unavailable shows an honest loading, stale or unavailable state.
- No account, no analytics, no cloud backend. Crash reporting is local-only unless a no-cost, privacy-preserving option is chosen (Open).
- Location stays on device. Play Data Safety form and privacy policy are required because location permission is used. DPDP Act obligations are likely light because nothing leaves the device (confirm).
- Open-source attributions screen (engine, gazetteer, fonts).
- Android-only notifications: types and schedule Open. Needs `POST_NOTIFICATIONS`, exact-alarm handling, and rescheduling after reboot or location change. The PWA channel does not offer reliable scheduled notifications.
- Check the app name "Arunodaya" for store conflicts before launch.

---

## 12. Testing and validation

**Astronomy**

- Golden dataset: about 20 Indian cities × 366 days from NOAA/JPL Horizons. Compare candidate engines against the proposed tolerances (sun ±1 min, moon ±2 min) and choose.
- Seasonal extremes, year boundaries, IST vs. UTC date mismatches, hill-station elevations.
- Navkarshi exactness, sunrise ceil, sunset floor, displayed gap always 48 min, daylight arithmetic matches displayed endpoints.
- Missing moonrise/moonset handling; `(+1)` attribution.

**Countdowns and greeting**

- Before sunrise, between sunrise and Navkarshi, between Navkarshi and sunset, after sunset.
- Countdown reaches zero exactly at the **displayed** minute, never before. Rollover at the exact instant. Midnight, month and year rollover.
- Three independent targets, progress uses the correct previous/next pair, no seconds, minute-boundary updates.
- Greeting boundaries at 04:00, solar noon, 17:00 and sunset + 3 h, including north-east India in winter when sunset falls before 17:00.
- Digit direction and no layout shift.

**Location and platform**

- GPS granted/denied/unavailable/stale; thresholds; outside-India handling; manual and PIN search.
- Device timezone ≠ IST still shows IST.
- App killed and restarted; widget survives; snapshot expiry and fallback; stale `≈` behavior.
- Launcher resize small/medium/large; OEM battery behavior on Xiaomi, Oppo, Vivo, Realme and Samsung devices.
- Event-time alarms with and without exact-alarm permission.
- TS↔Kotlin parity tests if a native fallback calculator exists.

**Extras**

- Date picker across the full range; picked-date view never mixes with live countdowns.
- PDF correctness: values identical to the app, fonts embedded, A4 layout, 28/29/30/31-day months.
- Share card renders correctly in light/dark, never leaks coordinates.
- Next-moonrise search across days with no moonrise.

**Accessibility and fonts**

- Contrast, large font scale, TalkBack minute-level announcements, reduced motion, glyph test of the chosen serif on real devices.

---

## 13. Roadmap (revised)

1. **Repository, CI and Pages skeleton:** create the repository, monorepo layout, strict TypeScript, lint and test workflow, GitHub Pages deployment of an empty shell, ADR folder (§18–19).
2. **Foundation and contracts:** React/Vite/TS project, semantic design tokens and theme package, bundled fonts, resource layer for strings, snapshot schema, widget limits documented.
3. **Engine and validation:** benchmark engines, pick one, exact events, Navkarshi, rounding rules, moon events, golden dataset tests.
4. **Location and IST:** hybrid strategy, thresholds, outside-India handling, offline city/PIN search, saved locations.
5. **Core screens:** Home, Forecast, Astronomy, Locations, Settings, greeting, countdowns with progress and rolling digits, all built-in themes and the theme selector.
6. **Extras:** date picker, next-moonrise countdown, monthly PDF, share card.
7. **Android shell and widgets:** Capacitor, snapshot handoff, widget theme palette, Glance widgets, refresh, alarms, OEM guide.
8. **Notifications (if kept):** types, permissions, rescheduling.
9. **Hardening and release:** device matrix QA, accessibility, privacy policy on GitHub Pages, Data Safety form, Play listing.
10. *(Later)* Optional PWA polish; backlog features.

---

## 14. Decision register

**Decided**

- Android only for now; English only for now; hybrid fixed/solar greeting; utility extras in v1.
- Displayed-instant countdowns; sunrise ceil, Navkarshi ceil, sunset floor.
- Bundled lining-figure serif instead of Georgia.
- Precomputed snapshot handoff to widgets; absolute-time-first widget with staleness marking and event-driven refresh.
- Approximate location only; engine chosen by benchmark.
- No Jain-specific or Panchang-style features in v1.
- **Hosting and source control:** the web build deploys to GitHub Pages through GitHub Actions; Git and GitHub for source control.
- **Repository:** `arunodaya-solar-events` on your GitHub account (not yet created).
- **Themes:** Light, Dark (charcoal-green), Pure Dark, Darker, and curated custom theme packs. Match system maps system light to Light and system dark to Pure Dark only, with no user-chosen pair.
- **Theme pack lineup:** Navy, Burgundy, Aubergine, Midnight Teal (dark) and Porcelain, Sandstone (light). Palettes still Open.
- **System design:** layered architecture with a framework-free domain core, versioned contracts and automated quality gates (§17).
- **Licence (Decided):** MIT, with the LICENSE file created with the repository. Third-party data and fonts keep their own licences and are listed in a NOTICE file.
- **Monorepo toolchain (Decided):** npm workspaces with a single committed package-lock.json.
- **Application ID (Decided):** in.gautam.arunodaya (permanent once published).

**Proposed (confirm)**

- Minimum Android 8.0 / API 26.
- PWA kept as a secondary Android-browser channel.
- Countdown label from whole IST clock minutes.
- Evening greeting length 3 h, evening starting at the earlier of 17:00 and sunset; location thresholds; 20-min staleness threshold.
- Moon/twilight/golden-hour start-ceil, end-floor rule; solar noon nearest; moon reference at 12:00 IST.
- Golden hour = sunrise to +6°; supported date range 2000–2100.
- Out-of-India behavior; per-widget location; 12-month PDF export.
- Public repository (GitHub Pages on a free plan needs one), npm workspaces monorepo, trunk-based branching with pull requests, ADRs for key decisions.
- Every theme pack keeps the solar accent in the gold/amber family; light packs use a darker gold text token.
- Android release build without the INTERNET permission if Capacitor allows it.

**Open**

- Final serif and sans selection after glyph test; palette and token values for every theme.
- Final engine after benchmark; accuracy tolerances.
- Gazetteer and PIN datasets and licenses; PDF library.
- Notification types and schedule; crash reporting approach.
- Production copy for empty/error/stale states.
- Custom domain or the default github.io project URL.

---

## 15. Guardrails (updated)

- Do **not** use time-since-event or a single shared target in place of three independent next-occurrence countdowns.
- Do **not** show seconds in countdowns or use a separate progress bar.
- Do **not** let rolling digits change baseline, width or layout, or reverse their direction.
- Do **not** let a countdown reach zero before the displayed time. Countdowns target displayed instants.
- Do **not** add 48 minutes to a rounded sunrise label. Derive Navkarshi from the exact instant, then round.
- Do **not** round sunset up, or sunrise/Navkarshi down.
- Do **not** use device timezone instead of IST.
- Do **not** fabricate missing moonrise/moonset.
- Do **not** require background location, a backend, accounts or paid APIs.
- Do **not** claim minute-by-minute widget updates or continuous widget animation without device verification. Widget absolute times are the source of truth.
- Do **not** mistake prototype values and interactions for real calculations.
- Do **not** reintroduce Georgia for numbers without a new explicit decision.

---

## 16. Deferred backlog (not in v1)

Planned only after v1 ships, using the same engine and snapshot model, so no rework is needed:

- **Jain-specific:** Porsi/Sadh-porsi/Purimuddh/Avaddh, Chovihar cutoff, tithi and paksha, Vikram/Veer Nirvan Samvat, fasting-tithi and parv calendar.
- **Panchang-style:** Brahma muhurta, Abhijit muhurta, Rahu Kaal, Choghadiya, Pradosh.
- **Localization:** Hindi, Gujarati and Marathi (needs a font with Devanagari/Gujarati coverage and a numeral policy).
- **iOS:** only if scope changes; PWA-only without widgets by default.

## 17. System design and architecture

Arunodaya is a pure calculation core wrapped by thin adapters, so the same rules drive the app, the widgets, the PDF and the tests. Everything in this section is Proposed except where marked Decided.

&#91;embedded content: architecture · 4 web layers, 4 Android parts\]

The web app computes and writes a snapshot; the Android side only looks it up. Both sides are tested against the same fixtures.

### 17.1 Layers

- **Domain core (`packages/engine`):** pure TypeScript with no DOM, Capacitor or I/O. It takes `now` as an argument (an injected clock) and returns plain data: astronomy, rounding, Navkarshi, occurrence search, progress, greeting selection.
- **Contracts (`packages/contracts`):** versioned types and runtime schemas (for example Zod) for the snapshot, location and preferences, validated at every boundary: storage reads and the native bridge.
- **Application layer:** use cases such as `refreshSnapshot`, `resolveLocation` and `getHomeState(now)`. They orchestrate the core and the ports and contain no UI.
- **Ports and adapters:** interfaces for location, storage, clock, share, files and the snapshot bridge. Adapters implement them for Capacitor (Android), the browser (PWA) and in-memory fakes (tests). Dependencies point inward only.
- **UI (`apps/app`):** React components that render view-models. The once-a-minute tick lives in one hook. No astronomy inside components.
- **Native layer (Kotlin):** a snapshot repository, a pure-Kotlin widget state resolver (snapshot and now to what to show), a Glance renderer and a scheduler (alarms, WorkManager). The Capacitor bridge plugin exposes `writeSnapshot`, `setWidgetPalette`, `requestWidgetUpdate` and `getWidgetStatus`.

### 17.2 Principles

1. **Pure core, injected clock.** Deterministic code, testable at any simulated time.
2. **Derive, don't store.** Persist coordinates, preferences and the snapshot only. Countdowns, greetings and progress are computed from `now` on each tick.
3. **One time rule.** Instants are epoch milliseconds. IST is applied only at the edge by one helper using the fixed +05:30 offset. A lint rule bans local-time APIs elsewhere, and CI runs the tests under several `TZ` values to prove device timezone never leaks.
4. **Explicit states.** Loading, ready, stale and unavailable are discriminated unions the UI must handle, which enforces "never fabricate an event time".
5. **Versioned data.** `schemaVersion` plus migrations for snapshot and preferences, so old data never crashes a newer app.
6. **Cross-language conformance.** Shared JSON fixtures (snapshot and now, to expected widget state) run in both TypeScript and Kotlin tests.
7. **Heavy work off the UI thread.** Generating the 60 to 90 day snapshot runs in a Web Worker. Set a time budget after measuring on a low-end phone.
8. **Configuration in one place.** Thresholds (location, staleness, horizons) live in one typed config module, not scattered constants.
9. **Fail visibly, log locally.** A diagnostics screen with a ring-buffer log the user can export for bug reports. No telemetry (matches §11).

### 17.3 Security and privacy by design

- No network is needed at runtime. Ship the Android release without the INTERNET permission if Capacitor allows it, and keep a strict content-security policy on the web build with no remote code or fonts.
- Pin dependencies, enable Dependabot and run an audit in CI.
- Signing keys and keystores never enter the repository (§18.4).

### 17.4 Quality gates (Decided direction)

| Gate | Checks | Runs |
| --- | --- | --- |
| Types and lint | Strict TypeScript, no local-time APIs, no hard-coded colours | Every pull request |
| Unit and property tests | Rounding, 48-minute Navkarshi gap, countdown rollover, greeting boundaries | Every pull request |
| Golden astronomy dataset | Engine against NOAA/JPL reference data within tolerance | Engine changes and nightly |
| Contract and conformance | Schema compatibility, TypeScript to Kotlin fixtures | Every pull request |
| Theme gates | Contrast for every theme, visual regression screenshots | Theme and component changes |
| Accessibility | Automated checks on key screens | Every pull request |
| Budgets | JavaScript bundle size, PWA audit | Every pull request |
| Android build | Assemble, Kotlin unit tests, widget previews | Pull requests and release tags |

### 17.5 Decision records

Short architecture decision records in `docs/adr/` (context, decision, consequences) for: astronomy engine, fonts, snapshot design, widget refresh strategy, theme system, hosting and the repository layout.

## 18. Source control and repository

Git and GitHub are installed and no repository exists yet. The plan below is Proposed. The repository name is Decided (arunodaya-solar-events, on your GitHub account); the licence is Open.

### 18.1 Repository

- **Name (Decided) and visibility (Proposed):** `arunodaya-solar-events`, **public**, under your GitHub account. GitHub Pages on a free plan serves public repositories only. A public repository is safe here because there is no backend and no secret in the code.
- **Licence (Decided):** MIT, with the LICENSE file created with the repository. Third-party data and fonts keep their own licences and are listed in a `NOTICE` file.
- **Default branch:** `main`.

### 18.2 Workflow

- **Trunk-based:** short-lived branches (`feat/...`, `fix/...`, `docs/...`) merged to `main` by pull request, even when working alone, so CI runs before every merge.
- **Protected `main`:** CI must pass, no force pushes, squash merges for a clean history.
- **Commits and versions:** Conventional Commits (`feat:`, `fix:`, `docs:`, `chore:`) and semantic-version tags (`v0.1.0`). GitHub Releases carry notes and the Android build artifacts.
- **Planning:** one issue per roadmap step (§13) with labels per area (engine, widget, theme, location). Each architecture decision ships with its ADR in the same pull request.

### 18.3 Monorepo layout (supersedes §10.2)

npm workspaces with one lockfile.

```text
arunodaya-solar-events/
  apps/
    app/                 # React + Vite + Capacitor; android/ lives here
  packages/
    engine/              # pure TypeScript domain core (§17)
    contracts/           # types, runtime schemas, snapshot schema versions
    themes/              # theme definitions, token compiler, contrast checks
  tools/                 # golden-dataset generator, gazetteer builder, snapshot validator
  docs/
    spec/                # this specification exported to Markdown
    adr/                 # architecture decision records
    AGENT-RULES.md       # agent rules and governance (R1-R12)
    ARCHITECTURE.md      # architectural layers and invariant rules
    PLAN.md              # 12-prompt sequenced delivery plan
    TOOLCHAIN.md         # runtime constraints and dependency pinning
  .github/
    workflows/           # CI, Pages deploy, Android build
  README.md  LICENSE  NOTICE
```

### 18.4 First-commit checklist

- `.gitignore` covering `node_modules`, `dist`, Android build outputs, `local.properties`, `*.jks`, `*.keystore` and `.env*`.
- README with a one-paragraph description, how to run the app, and a link to the spec. Export this spec into `docs/spec/`.
- **Never commit signing keys.** Release signing uses GitHub Actions encrypted secrets, and Google Play App Signing keeps the real app-signing key off your machine.
- Keep large generated data (the golden dataset) compact or generate it in CI so the repository history stays small.
- Create and push, using the GitHub CLI if it is installed (otherwise create an empty repository on github.com and add it as `origin`):

```bash
git init -b main
git add .
git commit -m "chore: initial commit"
gh repo create arunodaya-solar-events --public --source=. --remote=origin --push
```

## 19. CI/CD and GitHub Pages deployment

The web build deploys to GitHub Pages from `main` through GitHub Actions (Decided). The Android app does not depend on Pages at runtime, because it bundles its own copy of the web assets. Details below are Proposed.

### 19.1 Workflows

| Workflow | Trigger | Does |
| --- | --- | --- |
| CI | Every pull request and push | Install, lint, type-check, unit and property tests, theme gates, builds for both targets |
| Pages deploy | Push to `main` after CI passes | Build with the Pages base path, upload the artifact, deploy to the `github-pages` environment |
| Android build | Version tag (`v*`) | Build the release bundle and APK, sign with repository secrets, attach to a GitHub Release |
| Nightly | Schedule | Golden astronomy dataset comparison, dependency audit |

Also enable Dependabot and CodeQL scanning (free for public repositories).

### 19.2 Pages setup

- **One-time:** in the repository's Settings, Pages, set the source to **GitHub Actions**. Do not use a `gh-pages` branch.
- **Workflow:** the official actions `configure-pages`, `upload-pages-artifact` and `deploy-pages`, with `pages: write` and `id-token: write` permissions and the `github-pages` environment.
- **URL:** the default is `https://<user>.github.io/arunodaya-solar-events/`. A custom domain is optional and its yearly cost sits outside the ₹0 target (Open).
- **HTTPS:** Pages serves HTTPS, which geolocation and service workers require.

### 19.3 Project-site specifics

- **Base path:** a project site lives under `/arunodaya-solar-events/`. Two build targets: `build:pages` sets the Vite `base` to `/arunodaya-solar-events/`, and `build:android` uses `./` for the Capacitor bundle.
- **PWA scope:** the manifest `start_url`, `scope` and service-worker registration must all include the base path.
- **Routing:** Pages has no server rewrites, so use hash-based routing. It also works unchanged inside Capacitor.
- **Caching and updates:** Pages serves files with a short cache lifetime (about 10 minutes), so rely on hashed asset names and the service worker for versioning. Show a "new version available, reload" prompt instead of silently swapping versions mid-session.
- **Size:** keep the published site well under GitHub's limits (about 1 GB site size and a soft bandwidth limit). Load the gazetteer lazily and compressed.

### 19.4 What else Pages hosts

- **Privacy policy** at a stable URL such as `/privacy/`, which the Play listing and Data Safety form need.
- A minimal about and support page.

### 19.5 Releases and secrets

- Android signing material lives only in encrypted repository secrets (keystore as base64, passwords), used only by the tag-triggered workflow. Prefer Google Play App Signing.
- **Rollback:** revert the commit on `main` and let the Pages workflow redeploy. Tags make any Android release reproducible.
- **No staging environment** on Pages. Review changes by running the build locally or downloading the CI build artifact.

## 20. Implementation plan

The 12-prompt phased implementation plan and delivery tracker live in [docs/PLAN.md](../PLAN.md).

*End of specification v2.*
