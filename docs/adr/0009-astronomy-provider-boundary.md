# ADR 0009: Astronomy Provider Boundary and Encapsulation

## Status

Accepted

## Context

Following the selection of `astronomy-engine` in ADR 0008, the application core must calculate solar, lunar, and twilight phenomena across India. However, direct third-party library dependencies throughout the domain core violate architectural boundaries (ADR 0004, `INV-LAYERS`), and uncontrolled exposure to date/time constructs risks time-zone corruption and locale drift (`INV-TIME`, `INV-CLOCK`).

Furthermore, `astronomy-engine` has specific calling conventions:

1. It accepts `Date` objects as time inputs (internally converting to Julian centuries). If a numeric value is passed directly to functions expecting `AstroTime` or `Date`, `astronomy-engine` interprets numbers as Julian days since J2000 (`days since 2000-01-01 12:00 UTC`), not epoch milliseconds.
2. In polar or extreme latitude scenarios, certain events (such as sunrise or sunset during polar day/night) physically do not occur. In such cases, the engine must never invent fallback times or return null/undefined without structured error propagation.

## Decision

1. **Path-Scoped Provider Boundary**:
   The production astronomy provider is isolated strictly under `packages/engine/src/astro/`. This directory is the sole location in the production codebase permitted to import `astronomy-engine`, enforced via a path-scoped dependency allowance in `tools/invariants.config.json` under rule `INV-LAYERS`.

2. **Strict Instant-Carrier Date Usage**:
   - `new Date(epochMs)` (single argument with finite integer milliseconds) and `date.getTime()` are used strictly as instant carriers at the `astronomy-engine` boundary.
   - Zero-argument `new Date()` is strictly forbidden and flagged by `INV-CLOCK`.
   - Local-time getters (`getHours()`, `getDate()`, `getTimezoneOffset()`, etc.) remain strictly forbidden and flagged by `INV-TIME`.
   - Raw numbers must never be passed directly as time instances to `astronomy-engine` APIs.

3. **Error Handling via Result Type**:
   Required solar events that physically cannot be calculated (e.g. polar latitudes) return `Result.err({ code: 'event_missing', kind, message })`. Fallback or invented times are never produced. Moon rise and set events may legitimately be absent for a given IST day (a day with no moonrise or moonset) and are returned as empty arrays.

4. **Elevation Policy (v1)**:
   In Arunodaya v1, observer elevation is stored and displayed for informational purposes, but calculation of sunrise, sunset, and solar events uses the standard sea-level astronomical horizon (`elevation = 0`).

5. **Solar Noon Storage**:
   Solar noon is computed and stored as the exact epoch instant (`solarNoonMs`), while display rounding to the nearest minute is applied strictly in display layers per specification section 3.3.

6. **Accuracy Tiers (Proposed)**:
   - `standard`: Calendar dates from `2000-01-01` through `2035-12-31`. Within this window, astronomical models have minimal $\Delta T$ uncertainty.
   - `approximate`: Dates from `2036-01-01` through `2100-12-31`. These calculations remain accurate within $\pm 1$ minute for sun events but are labelled approximate due to empirical Earth rotation ($\Delta T$) drift.
   - `unsupported`: Dates before `2000-01-01` or after `2100-12-31`.

## Consequences

- Invariants checker (`INV-LAYERS`) is updated to support path-scoped external package allowances.
- Domain logic outside `src/astro` remains purely agnostic of the underlying astronomy library.
- Zero risk of passing numeric epoch milliseconds as J2000 day offsets to `astronomy-engine`.
- Snapshot building can safely rely on deterministic `Result<DayRecord, AstroError>` values.
