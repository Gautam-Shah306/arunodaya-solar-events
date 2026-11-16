# ADR 0007: Greeting configuration and keys

## Status

Accepted

## Context

The Arunodaya application displays contextual greetings throughout the day (morning, afternoon, evening, night). These greetings must remain decoupled from specific human languages and presentation formatting, while adhering to the solar and civil time anchors specified in Section 5.2 of `ARUNODAYA-SPEC.md`.

## Decision

1. **Language-neutral keys**: The engine's greeting selector returns a strongly-typed union key: `'morning' | 'afternoon' | 'evening' | 'night'`. Resolution to localized English text (e.g. "Good morning") is deferred to the app layer's string resources (Prompt 5).
2. **Centralized typed config**: Greeting boundaries and rules are defined in a single immutable configuration object:
   - Fixed morning start: 04:00 IST (`240` minutes from midnight).
   - Fixed evening anchor: 17:00 IST (`1020` minutes from midnight).
   - Evening length after sunset: 180 minutes (3 hours).
   - Earlier-of rule: `eveningStartsAtEarlierOfFixedAndSunset = true` (Proposed), meaning evening begins at `min(17:00 IST, sunset)` when enabled.
3. **Solar anchors**: The morning-to-afternoon transition occurs at exact solar noon, and evening transitions to night 3 hours after sunset (or 04:00 IST the next morning, whichever is earlier).

## Consequences

### Positive

- Engine logic remains pure and language-agnostic.
- Time calculations adhere strictly to the specification contract.
- Greeting transitions are configurable and testable without UI dependencies.

### Negative

- UI presentation requires a mapping layer to convert greeting keys into display strings.
