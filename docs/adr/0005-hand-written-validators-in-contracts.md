# ADR 0005: Hand-written validators in contracts package

## Status

Accepted

## Context

`@arunodaya/contracts` defines the core data contracts and validation routines for Arunodaya snapshots. The package must maintain zero third-party runtime dependencies to eliminate supply chain risks, avoid bundle bloat, and comply with architectural layering constraints (`INV-LAYERS`). External schema validation libraries (such as Zod, Valibot, or Yup) introduce runtime dependency trees, version drift, and potential bundle overhead.

## Decision

All validation functions in `@arunodaya/contracts` (such as `validateSnapshot`) are hand-written in pure TypeScript without third-party libraries. Validators:

1. Return a strongly-typed `Result<T, ValidationIssue[]>` rather than throwing exceptions on invalid input.
2. Collect every validation failure (up to a bounded cap of 100 issues) with its JSON path (e.g. `days[3].sunrise.displayMs`).
3. Safely handle malformed, primitive, or null input without throwing unhandled exceptions.

A schema library is rejected for now. This decision will only be revisited if hand-written validator code exceeds 600 lines or maintenance complexity significantly increases.

## Consequences

### Positive

- Zero runtime dependencies in `@arunodaya/contracts`.
- Predictable error collection reporting path, code, and human-readable messages.
- Full compliance with `INV-LAYERS` and `INV-DEPS`.
- Minimal bundle size overhead.

### Negative

- Validator logic requires careful manual test coverage across structural, type, range, and ordering constraints.
