# Arunodaya Architecture

## Architectural Layers (Spec Section 17)

1. **Domain core** (`packages/engine`): Pure astronomical and mathematical calculations. Self-contained, deterministically tested against reference tables. No DOM, no browser globals, no system clock access.
2. **Contracts** (`packages/contracts`): Canonical data shapes, serialization models, and schema versioning. Zero runtime dependencies.
3. **Application layer** (`apps/app` logic): State coordination, countdown derivation, location resolution workflows.
4. **Ports and adapters** (`packages/engine` adapters / app services): Geolocation provider, local storage, system clock injection.
5. **UI** (`apps/app` presentation, `packages/themes`): Visual components, theme tokens, rolling digits odometer, layout screens.
6. **Native layer** (Android/Capacitor): Android AppWidget provider, Glance views, background workers.

## Package Map

- `packages/engine` (`@arunodaya/engine`): Astronomical calculations, solar and lunar ephemeris, Navkarshi derivation, twilight and golden-hour math.
  - `src/config.ts`: Centralized engine configuration (`NAVKARSHI_OFFSET_MINUTES = 48`, `GREETING`, `SUPPORTED_YEARS`, `SNAPSHOT_POLICY`, `ASTRONOMY_ENGINE`, `ACCURACY`).
  - `src/clock.ts`: Clock abstraction interface (`Clock`) with test implementations (`createFixedClock`, `createManualClock`).
  - `src/time/ist.ts`: Strict IST (+05:30) civil time representation, millisecond conversions, and clock formatters.
  - `src/time/rounding.ts`: Start/end/nearest display rounding, `makeEvent`, `makeNavkarshi`, and daylight duration calculations.
  - `src/time/occurrences.ts`: Chronological series indexing, `nextOccurrence`, `previousOccurrence`, and day record lookups.
  - `src/time/countdown.ts`: Wall-clock countdown derivation, progress fraction, formatting, and live snapshot target evaluation.
  - `src/time/greeting.ts`: Solar-aware greeting selection (`morning`, `afternoon`, `evening`, `night`).
  - `src/time/day-night.ts`: Day/night phase selection based on displayed sunrise and sunset boundaries.
  - `src/time/snapshot-status.ts`: Snapshot lifecycle status derivation (`not_started`, `ready`, `expiring`, `expired`).
  - `src/astro/`: Encapsulated astronomy provider boundary (ADR 0009). The only directory in `packages/engine` permitted to import `astronomy-engine` via path-scoped allowance.
    - `types.ts`: Observer, AstroDay, AstroError, and AccuracyTier definitions.
    - `accuracy.ts`: Accuracy tier evaluator (`standard` through 2035, `approximate` through 2100).
    - `astro-day.ts`: Pure astronomical event calculations via `astronomy-engine`.
    - `day-record.ts`: DayRecord mapping and MoonEvent derivation per specification section 3.3.
    - `snapshot-builder.ts`: Synchronous, pure multi-day snapshot planner and builder (`buildSnapshot`, `buildSnapshotAround`).
- `packages/contracts` (`@arunodaya/contracts`): Shared data contracts, snapshot schema versions, coordinate models, and validation.
  - `src/result.ts`: Zero-dependency `Result<T, E>` algebraic type and builders (`ok`, `err`).
  - `src/civil-date.ts`: Pure integer Gregorian algorithms (`isLeapYear`, `daysInMonth`, `daysFromCivil`, `civilFromDays`, `weekdayFromDays`, `parseCivilDate`, `formatCivilDate`, `addDaysToCivilDate`). **Architectural Rule**: All civil-date calendar primitives live in contracts so both contracts validators and domain engines share a single source of date arithmetic without cross-package circularity.
  - `src/ev.ts`: Core astronomical event instant model (`Ev`) carrying exact (`exactMs`) and displayed (`displayMs`) epoch timestamps.
  - `src/snapshot.ts`: Schema v1 definitions (`SnapshotV1`, `DayRecord`, `MoonEvent`, `SnapshotLocation`, `SCHEMA_VERSIONS`).
  - `src/validate.ts`: Hand-written, zero-dependency validation suite accumulating path-annotated `ValidationIssue` entries.
  - `src/migrate.ts`: Snapshot schema version migration pipeline.
- `packages/themes` (`@arunodaya/themes`): Design tokens, theme definitions, contrast guarantees, colour maths, and widget palettes. **Architectural Rule**: The themes package imports nothing outside itself (no DOM globals, no system clock, no imports from contracts or engine).
  - `src/types.ts`: Semantic token names (23 tokens), widget token names (12 tokens), theme definitions, and theme choice types.
  - `src/color.ts`: Pure colour maths: hex parsing, relative luminance (WCAG sRGB), contrast ratio, HSL, CIE L*a*b*, CIE76 Delta E, and hue distance.
  - `src/contrast-spec.ts`: Typed contrast specification checks across token and widget scopes.
  - `src/contrast.ts`: Theme evaluator returning per-check contrast results and pairwise canvas distinctness evaluator.
  - `src/registry.ts`: Ten theme definitions registry, ID lists, system theme resolution (`light` for light mode, `pure-dark` for dark mode), parser, and serializer.
  - `src/css.ts`: CSS custom property generator (`--ar-*`) and canvas meta color extractor.
  - `src/android.ts`: Signed 32-bit ARGB integer conversion (`toAndroidColorInt`) and widget palette conversion for Android Glance/RemoteViews.
  - `src/preview-model.ts`: Pure preview model builder (`buildThemePreviewModel`) for test swatches, contrast tables, and static sample UI.
  - `src/themes/`: Individual theme definition files (4 built-in themes, 6 custom pack themes).
- `apps/app` (`@arunodaya/app`): Web/PWA application shell, theme application helper, snapshot background pipeline, components, and review galleries.
  - `src/app/`: Application shell, hash routing (`routes.ts`), navigation `TabBar`, and screens (`FoundationHome`, `ComingSoon`).
  - `src/core/`: Application ports and adapters: `storage.ts` (`KeyValueStore` port and `localStorage` adapter), `prefs.ts`, `clock.ts`, `debug.ts`, and `theme-controller.ts`.
  - `src/i18n/`: English localization (`en.ts`), date formatting, and accessible screen-reader labels.
  - `src/snapshot/`: Web Worker snapshot calculation pipeline (`snapshot.worker.ts`, `request-handler.ts`, `client.ts`, `service.ts`).
  - `src/ui/`: UI components and hooks: `Countdown.tsx`, `RollingDigits.tsx`, `rolling-digits-model.ts`, `useNow.ts`, and `useSnapshot.ts`.
  - `src/theme/apply-theme.ts`: Runtime CSP-compliant theme application helper via CSSOM (`element.style.setProperty`), setting `--ar-*` custom properties and `data-theme`.
  - `src/assets/fonts/`: Bundled Gelasio WOFF2 serif font files (Regular 400, SemiBold 600) with OpenType tabular (`tnum`) and lining (`lnum`) figures.
  - `public/early-theme.js`: IIFE inline bootstrap script executing before initial paint to prevent theme flash.
  - `themes.html`: Standalone review gallery page for visual inspection of all ten themes across viewports, with dynamic "Match system" preview and contrast status tables.
  - `components.html`: Standalone components review gallery for testing countdowns, rolling animations, step controls, and 48px digit alignment specimen.
  - `src/themes-gallery.ts`: Client script powering the theme review gallery.
  - `src/components-gallery.tsx`: React entry powering the component review gallery.
  - `src/main.tsx`: Production React entry bootstrapping storage, preferences, theme controller, clock, snapshot service, and mounting into `#root`.
  - `src/themes.css`: Scoped gallery styling referencing only `--ar-*` tokens with system-colour fallbacks.
- `tools`: Monorepo build, verification, typechecking, and invariants enforcement utilities.

## Dependency Rules

```text
packages/engine    --> relative modules, @arunodaya/contracts, and astronomy-engine (strictly inside src/astro/)
packages/contracts --> relative modules only
packages/themes    --> relative modules only (imports nothing outside itself)
apps/app           --> all workspace packages (@arunodaya/*)
tools              --> standalone Node scripts; cannot be imported by runtime packages
```

No package may import from `apps/*`.

## Shared Tolerances and Golden Testing

- **Shared Tolerances File**: `packages/engine/tests/data/astro-tolerances-v1.json` defines canonical accuracy tolerances and tight regression guards across both tools benchmarks and engine tests (ADR 0010).
- **Golden Test Project**: Full validation across 2,814 reference city-days runs in a separate Vitest project (`golden`) via `npm run test:golden`. Excluded from standard fast test runs and coverage, executed during `npm run verify`, CI verification, and nightly pipelines.

## Architectural Invariants Enforcement

| Rule          | Statement Enforced                                                                                                                                                                                                                                                                                                                                                 |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `INV-LAYERS`  | Enforces package import boundaries; forbids imports from `apps/*` into `packages/*`; forbids external dependencies except path-scoped allowances (`astronomy-engine` in `packages/engine/src/astro/`); forbids DOM/Node globals (`window`, `document`, `navigator`, `localStorage`, `indexedDB`, `process`) in `packages/engine/src` and `packages/contracts/src`. |
| `INV-TIME`    | Guarantees all time operations use IST (+05:30); bans local-time APIs outside `packages/engine/src/time/ist.ts`.                                                                                                                                                                                                                                                   |
| `INV-CLOCK`   | Enforces that pure packages (`engine`, `contracts`) never read system clock directly (`Date.now`, zero-arg `new Date()`, `performance.now`); clock must be injected.                                                                                                                                                                                               |
| `INV-COLOR`   | Forbids colour literals outside `packages/themes`. UI code must consume theme tokens or CSS system-colour keywords.                                                                                                                                                                                                                                                |
| `INV-NET`     | Forbids runtime network activity (`fetch`, `XMLHttpRequest`, `WebSocket`, `EventSource`, `navigator.sendBeacon`, absolute URLs).                                                                                                                                                                                                                                   |
| `INV-DEPS`    | Enforces exact dependency versions and workspace version alignment.                                                                                                                                                                                                                                                                                                |
| `INV-LICENSE` | Ensures every production package has a permissive allowlisted open-source licence.                                                                                                                                                                                                                                                                                 |
| `INV-SECRETS` | Blocks credentials, private keys, keystores, and environment configuration files.                                                                                                                                                                                                                                                                                  |
| `INV-LF`      | Enforces repository-wide LF line endings across text files (including TypeScript, JavaScript, JSON, YAML, Markdown, HTML, CSS, and Python).                                                                                                                                                                                                                        |
| `INV-DOCS`    | Ensures all mandatory project specifications, ADRs, and guides exist.                                                                                                                                                                                                                                                                                              |
| `INV-BOM`     | Enforces that repository text files (including TypeScript, JavaScript, JSON, YAML, Markdown, text, and Python) are UTF-8 without a Byte Order Mark (BOM).                                                                                                                                                                                                          |
