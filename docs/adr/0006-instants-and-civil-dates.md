# ADR 0006: Instants and civil dates

## Status

Accepted

## Context

Solar calculations and user-facing countdowns require precise time handling. The JavaScript `Date` object relies on system local timezone settings, can perform implicit timezone conversions, and risks non-deterministic behavior across varied host environments. In addition, `@arunodaya/contracts` must validate `istDate` strings (format `YYYY-MM-DD` and calendar validity) without importing `@arunodaya/engine`, preserving package layering (`INV-LAYERS`).

## Decision

1. **Instants as integer epoch milliseconds**: All temporal instants in the contracts and engine packages are represented as integer milliseconds since the Unix epoch (1970-01-01T00:00:00.000Z).
2. **Fixed IST offset**: Indian Standard Time (IST) is strictly fixed at +05:30, or `19_800_000` milliseconds ahead of UTC. Because `19_800_000` is an exact multiple of `60_000` (1 minute), an IST clock minute and a UTC epoch minute coincide exactly.
3. **Integer civil-date algorithms**: Calendar arithmetic uses pure integer Gregorian civil-date algorithms (days from civil, civil from days) without ever instantiating JavaScript `Date` objects.
4. **Primitives in `@arunodaya/contracts`**: Civil-date primitives (`civil-date.ts`) reside in `@arunodaya/contracts` so contracts can validate calendar dates in snapshots independently. `@arunodaya/engine` builds the full IST helper on top of these primitives.

## Consequences

### Positive

- Fully deterministic time and calendar calculations independent of the operating system or host runtime timezone.
- Strict compliance with `INV-TIME` and `INV-CLOCK`.
- Adheres to layering rules: `@arunodaya/contracts` has zero dependencies and `@arunodaya/engine` depends on contracts.

### Negative

- Pure integer Gregorian formulas must be carefully implemented and verified against leap years and century boundaries.
