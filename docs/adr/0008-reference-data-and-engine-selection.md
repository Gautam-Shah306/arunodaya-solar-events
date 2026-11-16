# ADR 0008: Reference Data and Astronomy Engine Selection

## Status

Accepted (`astronomy-engine` selected)

## Context

Arunodaya Specification section 3.2 requires that the production astronomical engine be selected objectively by empirical benchmark against reference astronomical data. The contract establishes strict accuracy tolerances:

- Solar events: $\pm 1$ minute (60 seconds)
- Lunar events: $\pm 2$ minutes (120 seconds)

To evaluate candidates without circular dependency or reliance on the same analytic approximations used by candidate libraries, an independent, high-precision astronomical reference is necessary.

## Decision

1. **Primary Reference Ephemeris**: Skyfield (v1.55) using the NASA JPL DE440s planetary ephemeris kernel (`de440s.bsp`, SHA-256 `c1c7feeab882263fc493a9d5a5b2ddd71b54826cdf65d8d17a76126b260a49f2`). JPL DE440s covers the calendar years 1850 to 2150 with numerical integration. The older DE421 kernel was rejected because its horizon terminates in 2053, which fails to span Arunodaya's full supported date range (2000 to 2100).
2. **Mandatory Cross-Check**: PyEphem (v4.2.1) was executed alongside Skyfield across all 2,814 city-days. Every single event kind satisfied cross-check tolerances (sun kinds <= 30s, solar noon <= 30s, moon kinds <= 90s).
3. **Deterministic POSIX Time**: Reference event instants are generated as exact UTC epoch milliseconds (no leap seconds counted), matching POSIX timestamps used by JavaScript runtimes.
4. **Time Range Partitioning**: Due to inherent physical uncertainty in Earth rotation ($\Delta T$) for future epochs, engine selection decisions are based strictly on the 2,790 city-days in the decision set (2026 full year, 2000-01-01, 2028-02-29). Dates beyond 2030 (2035, 2050, 2075, 2100) are evaluated as extended-range informational checks and do not govern the engine selection gate.
5. **Toolchain Exception under R4**: To run Skyfield and PyEphem without introducing Python or native C compilers into the host environment, a single script `tools/reference/generate_reference.py` is permitted under rule R4, running exclusively inside a digest-pinned `python:3.12-slim@sha256:5e2bdb1b0d542d5039cffb8181c65930093949194a65c365dfb1b0fe13a4fa5b` container via `npm run reference:generate`.
6. **Benchmark Outcome and Chosen Engine**:
   - `astronomy-engine` (v2.1.19) **PASSED** all criteria on the decision set:
     - Maximum Sun error: 1.61s (vs 60s tolerance)
     - Maximum Solar Noon error: 0.30s (vs 30s tolerance)
     - Maximum Moon error: 7.23s (vs 120s tolerance)
     - Moon phase fraction and illumination error: 0.00
     - Non-boundary unmatched or extra events: 0
   - `suncalc` (v2.1.4) **FAILED** accuracy and completeness criteria with 28 unmatched moonrise and 29 unmatched moonset events.
   - Timing: `astronomy-engine` computed 92 consecutive days for Rajkot in 198.7 ms (~2.16 ms/day).
   - Range Advice: `astronomy-engine` maintains full sun accuracy within $\pm 1$ minute through 2100 (extended set maximum sun error at 2100 is 28.56s).
   - **Winning Engine**: `astronomy-engine`.

## Consequences

- The generated dataset `packages/engine/tests/data/astro-reference-v1.json` (936.7 KB) serves as the permanent golden test suite in CI.
- Prompt 4 will integrate `astronomy-engine` into `packages/engine` (introducing a path-scoped dependency allowance for `astronomy-engine`).
- Specification section 3.2 is updated with the benchmarked engine, golden dataset path, elevation rule, and supported range findings.
