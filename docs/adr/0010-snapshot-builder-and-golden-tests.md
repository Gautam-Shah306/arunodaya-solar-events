# ADR 0010: Snapshot Builder, Shared Tolerances, and Golden Tests

## Status

Accepted

## Context

Arunodaya widgets operate in Android background contexts where executing complex numerical integration or astronomy algorithms is forbidden due to battery limits and execution quotas. To support widgets and offline operation, the web application generates a precomputed, multi-day snapshot contract (`SnapshotV1`) written to native storage.

Additionally, ensuring that astronomy calculations do not regress or drift over time requires continuous validation against the committed reference dataset (`astro-reference-v1.json`). Running all 2,814 city-days on every test execution, however, adds significant test latency.

## Decision

1. **Deterministic Snapshot Window (`SNAPSHOT_POLICY`)**:
   - The snapshot builder generates 92 consecutive day records spanning yesterday (`daysBehind: 1`), today, and 90 days ahead (`daysAhead: 90`).
   - Moon rise and set events extend for an additional two lookahead days (`moonLookaheadDays: 2`, spanning 94 days total) to enable next-moonrise lookups across upcoming days when immediate events are absent.
   - Snapshot generation is synchronous, pure, and deterministic; `generatedAtMs` is provided exclusively via an injected `Clock`.
   - In Prompt 6, execution of the 92-day snapshot generation will be wrapped in a Web Worker to ensure zero main-thread UI jank, while the core builder remains a pure synchronous function.

2. **Self-Validating Snapshot Builder**:
   - Every snapshot produced by `buildSnapshot` is validated against `validateSnapshot` before being returned as `Result<SnapshotV1, SnapshotBuildError>`.
   - If any structural invariant fails, the builder returns `Result.err({ code: 'invalid_snapshot', issues })`.

3. **Single Source of Truth for Tolerances and Regression Guards**:
   - Accuracy tolerances and regression guards are stored in a single JSON file: `packages/engine/tests/data/astro-tolerances-v1.json`.
   - Tolerances enforce the spec contract (sun $\pm 60$ s, solar noon $\pm 30$ s, moon $\pm 120$ s).
   - Regression guards enforce tighter tolerances against algorithmic drift based on empirical benchmark results (sun $\le 5$ s, solar noon $\le 2$ s, moon $\le 15$ s, extended $\le 45$ s).

4. **Tiered Golden Test Strategy**:
   - **Quick Golden Suite**: Executes during standard test and coverage runs (`npm test`, `npm run test:coverage`), covering 144 core city-days (1st and 15th of each month in 2026, plus 2000-01-01 and 2028-02-29 across all 6 core cities).
   - **Full Golden Suite**: Executes all 2,814 city-days against the reference dataset in a dedicated Vitest project (`golden`) via `npm run test:golden`.
   - `test:golden` runs in `npm run verify`, CI verification, and the scheduled nightly workflow, but is excluded from `test:coverage` and `test:tz` to avoid slow test cycles.

## Consequences

- Widgets receive self-consistent, pre-validated data snapshots.
- UI main thread is never blocked during multi-day computation.
- Drift in astronomy calculation is prevented by automated regression guards in CI and nightly pipelines.
- Test velocity remains high during normal development while maintaining full golden coverage in CI and nightly runs.
