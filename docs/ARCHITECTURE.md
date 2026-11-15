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
- `packages/contracts` (`@arunodaya/contracts`): Shared data contracts, snapshot schema versions, coordinate models.
- `packages/themes` (`@arunodaya/themes`): Design tokens, theme definitions, contrast guarantees.
- `apps/app` (`@arunodaya/app`): Web/PWA application shell and future Capacitor host.
- `tools`: Monorepo build, verification, typechecking, and invariants enforcement utilities.

## Dependency Rules

```text
packages/engine    --> relative modules, @arunodaya/contracts
packages/contracts --> relative modules only
packages/themes    --> relative modules, @arunodaya/contracts
apps/app           --> all workspace packages (@arunodaya/*)
tools              --> standalone Node scripts; cannot be imported by runtime packages
```

No package may import from `apps/*`.

## Architectural Invariants Enforcement

| Rule          | Statement Enforced                                                                                                                                                                                                                               |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `INV-LAYERS`  | Enforces package import boundaries; forbids imports from `apps/*` into `packages/*`; forbids DOM/Node globals (`window`, `document`, `navigator`, `localStorage`, `indexedDB`, `process`) in `packages/engine/src` and `packages/contracts/src`. |
| `INV-TIME`    | Guarantees all time operations use IST (+05:30); bans local-time APIs outside `packages/engine/src/time/ist.ts`.                                                                                                                                 |
| `INV-CLOCK`   | Enforces that pure packages (`engine`, `contracts`) never read system clock directly (`Date.now`, zero-arg `new Date()`, `performance.now`); clock must be injected.                                                                             |
| `INV-COLOR`   | Forbids colour literals outside `packages/themes`. UI code must consume theme tokens or CSS system-colour keywords.                                                                                                                              |
| `INV-NET`     | Forbids runtime network activity (`fetch`, `XMLHttpRequest`, `WebSocket`, `EventSource`, `navigator.sendBeacon`, absolute URLs).                                                                                                                 |
| `INV-DEPS`    | Enforces exact dependency versions and workspace version alignment.                                                                                                                                                                              |
| `INV-LICENSE` | Ensures every production package has a permissive allowlisted open-source licence.                                                                                                                                                               |
| `INV-SECRETS` | Blocks credentials, private keys, keystores, and environment configuration files.                                                                                                                                                                |
| `INV-LF`      | Enforces repository-wide LF line endings.                                                                                                                                                                                                        |
| `INV-DOCS`    | Ensures all mandatory project specifications, ADRs, and guides exist.                                                                                                                                                                            |
