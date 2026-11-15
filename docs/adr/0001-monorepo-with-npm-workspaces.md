# ADR 0001: Monorepo with npm Workspaces and Android Application ID

## Status

Accepted

## Context

Arunodaya requires multiple distinct components:

1. Core astronomy calculation engine (`@arunodaya/engine`)
2. Canonical schema contracts (`@arunodaya/contracts`)
3. Theme definitions and tokens (`@arunodaya/themes`)
4. Front-end web/PWA and future Android container application (`@arunodaya/app`)
5. Verification, typecheck, and build tooling (`tools`)

Furthermore, publishing to Android requires a permanent, globally unique Application ID.

## Decision

1. We organize the repository as a monorepo using standard native `npm` workspaces (`apps/*` and `packages/*`) governed by a single root `package-lock.json`.
2. The Android Application ID is permanently fixed as `in.gautam.arunodaya`.

## Consequences

- Clean separation between pure domain calculation, contracts, and platform presentation.
- Single lockfile prevents version drift across packages.
- Zero external package managers required beyond standard Node 24 and npm >= 11.10.
- Application ID is locked early to guarantee stable Android manifest and widget configurations.
