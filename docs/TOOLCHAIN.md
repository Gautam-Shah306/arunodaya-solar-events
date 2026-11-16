# Toolchain Specification

## Measured Environment

- **Node.js**: `v24.21.0` (native)
- **npm**: `11.19.0` (native)
- **Docker image**: not needed for local build/test (native Node satisfies `>=24 <25` and npm satisfies `>=11.10`)
- **Host OS**: Windows 11 (PowerShell 5.1+)
- **Host Repository Path**: Contains spaces (`D:\Sem4 vac\arunodaya-solar-events`)

## Pinned Dependencies

All dependencies are exact-pinned devDependencies located at the repository root. At runtime, the application uses ₹0 infrastructure with zero third-party runtime dependencies.

| Package               | Version   | Licence      | Purpose                                                       |
| --------------------- | --------- | ------------ | ------------------------------------------------------------- |
| `typescript`          | `6.0.3`   | Apache-2.0   | TypeScript compiler and language services                     |
| `vitest`              | `5.1.0`   | MIT          | Unit and integration test runner                              |
| `@vitest/coverage-v8` | `5.1.0`   | MIT          | V8 code coverage provider                                     |
| `eslint`              | `10.15.0` | MIT          | Static analysis linter                                        |
| `@eslint/js`          | `10.0.1`  | MIT          | ESLint JavaScript recommendations                             |
| `typescript-eslint`   | `8.72.2`  | MIT          | TypeScript AST rules for ESLint                               |
| `prettier`            | `3.10.1`  | MIT          | Code formatting                                               |
| `vite`                | `8.3.8`   | MIT          | Application bundler and dev server                            |
| `fast-check`          | `4.10.2`  | MIT          | Property-based testing framework                              |
| `@types/node`         | `26.6.6`  | MIT          | Node.js standard library type definitions                     |
| `astronomy-engine`    | `2.1.19`  | MIT          | Astronomical calculation benchmark candidate (winning engine) |
| `suncalc`             | `2.1.4`   | BSD-2-Clause | Astronomical calculation benchmark candidate                  |

## Production Runtime Dependencies

The application core minimizes runtime dependencies to guarantee long-term stability and auditability. The only third-party runtime package in `packages/engine` is:

| Package            | Version  | Licence | Scope & Justification                                                                                                                                                                                      |
| :----------------- | :------- | :------ | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `astronomy-engine` | `2.1.19` | MIT     | Encapsulated under `packages/engine/src/astro/` via path-scoped allowance (`INV-LAYERS`). Evaluated in Prompt 3 benchmark; achieves 1.6s max sun accuracy and 7.2s max moon accuracy (ADR 0008, ADR 0009). |

### TypeScript Version Pin Rationale

`typescript` is strictly pinned to `6.0.3` because `typescript-eslint@8.72.2` declares a peer dependency constraint requiring a TypeScript version below `6.1.0` (`>=4.8.4 <6.1.0`). Bumping TypeScript to 7+ (as attempted by Dependabot) causes `npm ci` resolution failures. This pin will be revisited and upgraded when `typescript-eslint` officially adds support for a newer major version.

## Official GitHub Action Versions

Verified via `git ls-remote --tags`:

| Action                          | Major Version | Verified Release |
| ------------------------------- | ------------- | ---------------- |
| `actions/checkout`              | `v7`          | `v7.0.1`         |
| `actions/setup-node`            | `v7`          | `v7.1.0`         |
| `actions/upload-artifact`       | `v7`          | `v7.0.2`         |
| `actions/configure-pages`       | `v6`          | `v6.0.0`         |
| `actions/upload-pages-artifact` | `v5`          | `v5.0.0`         |
| `actions/deploy-pages`          | `v5`          | `v5.0.1`         |

## Workflow Linting Tool (Docker Digest Pinned)

Workflow YAML files in `.github/workflows/` are linted using `actionlint`:

- **Image**: `rhysd/actionlint:latest`
- **Digest**: `sha256:b1934ee5f1c509618f2508e6eb47ee0d3520686341fec936f3b79331f9315667`
- **Verified Execution Command**:

```powershell
docker run --rm -v ($pwd.Path + ':/work') -w /work 'rhysd/actionlint@sha256:b1934ee5f1c509618f2508e6eb47ee0d3520686341fec936f3b79331f9315667'
```

## Docker Reference Command (PowerShell-safe with Spaces)

When Docker execution is required on environments lacking native Node 24:

```powershell
docker run --rm -v ($pwd.Path + ':/work') -v arunodaya-node-modules:/work/node_modules -w /work 'node:24-bookworm-slim@sha256:dc26ae92c9fb15cf6b1d63e20f0944b2efe0f115b20e00be48fb23fceb061c54' npm ci
```

**Note on paths with spaces**: When the repository path contains spaces (e.g. `D:\Sem4 vac\...`), the PowerShell expression `($pwd.Path + ':/work')` safely evaluates into a single argument for the Docker `-v` parameter without shell argument fragmentation.

## Python Reference Dataset Generator (Docker Digest Pinned)

Astronomical reference data generation runs inside an isolated container with Skyfield and PyEphem:

Python reference image: python:3.12-slim@sha256:5e2bdb1b0d542d5039cffb8181c65930093949194a65c365dfb1b0fe13a4fa5b

These packages run exclusively inside the container and are never shipped in runtime builds:

| Package    | Version      | Licence      | Purpose                                          |
| :--------- | :----------- | :----------- | :----------------------------------------------- |
| `python`   | `3.12.16`    | PSF-2.0      | Container runtime environment                    |
| `skyfield` | `1.55`       | MIT          | Primary astronomical ephemeris computing engine  |
| `jplephem` | `2.24`       | MIT          | JPL SPK ephemeris file reader                    |
| `numpy`    | `2.5.5`      | BSD-3-Clause | Numerical math backend for Skyfield              |
| `ephem`    | `4.2.1`      | MIT          | Secondary astronomical reference and cross-check |
| `certifi`  | `2026.10.23` | MPL-2.0      | SSL root certificates for ephemeris retrieval    |
| `sgp4`     | `2.27`       | MIT          | Satellite orbit tracking dependency of Skyfield  |

### Ephemeris Kernel

- **Kernel file**: `de440s.bsp` (NASA JPL Planetary and Lunar Ephemerides)
- **File size**: `32,726,016` bytes (~32.7 MB)
- **SHA-256**: `c1c7feeab882263fc493a9d5a5b2ddd71b54826cdf65d8d17a76126b260a49f2`
- **Caching**: Stored in Docker named volume `arunodaya-skyfield-data` mounted at `/data`; never committed to Git.

### Reference Dataset Output

- **File Path**: `packages/engine/tests/data/astro-reference-v1.json`
- **File Size**: `1,296,724` bytes (~1.24 MB formatted, `936.7 KB` unformatted)
- **Total City-Days**: `2,814` (Decision set: `2,790`, Extended-range set: `24`)

## Astronomical Scripts

The reference generator and benchmark scripts are standalone developer tooling and are not executed as part of standard `npm run verify`:

| Script               | Command                             | Purpose                                                    |
| :------------------- | :---------------------------------- | :--------------------------------------------------------- |
| `reference:generate` | `node tools/generate-reference.mjs` | Generate Skyfield/PyEphem reference dataset in Docker      |
| `bench:astro`        | `node tools/bench-astro.mjs`        | Run empirical accuracy benchmark against reference dataset |

## Linux CI Verification

Linux verification executes the quality pipeline inside the digest-pinned Linux Node container to reproduce and guard against Linux-specific CI regressions:

- **Digest-Pinned Image**: `node:24-bookworm-slim@sha256:dc26ae92c9fb15cf6b1d63e20f0944b2efe0f115b20e00be48fb23fceb061c54`
- **Behavior**: `npm run verify:linux` exports tracked and non-ignored files into a temporary directory, mounts it at `/work` with an isolated Docker volume for `/work/node_modules`, runs `npm ci && npm run verify`, and returns the container exit code.
- **Index Mode (`--index`)**: `npm run verify:linux -- --index` exports only files currently staged in the git index (`git checkout-index`) into the temporary directory. If the index is empty, it immediately halts with exit code 1.
- **Root Cause (Prompt 1c)**: Test failures on Linux were caused by non-portable Windows drive path resolution in the file walker and Vitest default timeouts under container CPU load. Path normalization was updated to use Windows path resolution portably when drive letters are present, and test timeouts were extended to 30s.

## Timezone Matrix Verification (`test:tz`)

All application domain and time math is strictly India Standard Time (+05:30). To ensure calculations are completely independent of host machine locale and process timezone, `npm run test:tz` runs the packages test suite across six explicit timezones:

- `UTC`
- `Asia/Kolkata`
- `America/Los_Angeles`
- `Pacific/Kiritimati` (+14:00)
- `Pacific/Pago_Pago` (-11:00)
- `Europe/London`

## Byte Order Mark Invariant (`INV-BOM`)

All repository text files must be encoded as UTF-8 without a Byte Order Mark (BOM, `0xEF, 0xBB, 0xBF`). Windows PowerShell 5.1 cmdlets (`Set-Content`, `Out-File`) and shell redirection operators (`>`, `>>`) default to UTF-16LE or prepend a UTF-8 BOM, breaking Linux build toolchains and linters. Repository files must be edited using Node (`fs.writeFileSync`) or IDE tools, and compliance is automatically enforced by `INV-BOM`.

## Recommended Commit Flow

To ensure no uncommitted files or unstaged changes cause CI divergence:

```powershell
# 1. Stage changes
git add -A

# 2. Verify exact staged snapshot inside clean Linux container
npm run verify:linux -- --index

# 3. Commit verified staged tree
git commit -m "feat: description"
```

## Dependabot Policy

Dependabot runs weekly checks for `npm` and `github-actions`.

- **Astronomy Group**: `astronomy-engine` updates are grouped under `astronomy`. Pull requests updating this package must pass `npm run test:golden` before merging to prevent calculation drift.
- **TypeScript Major Ignore**: Dependabot is configured to ignore `version-update:semver-major` for `typescript` because `typescript-eslint@8.72.2` requires TypeScript `<6.1.0`. Once `typescript-eslint` supports TypeScript 7+, this rule will be removed.
- **PR Rate Limiting**: `open-pull-requests-limit: 5` is configured for both ecosystems to prevent pull request storms and ensure reviewable updates.

## Golden Test Suite and Nightly Automation

- **Golden Test Runner**: `npm run test:golden` (`vitest run --project=golden`, 300 s timeout) verifies 2,814 city-days against `packages/engine/tests/data/astro-reference-v1.json` (Skyfield with NASA JPL DE440s).
- **Shared Tolerances**: Benchmark tolerances and tight regression guards are defined once in `packages/engine/tests/data/astro-tolerances-v1.json`.
- **Nightly Workflow (`.github/workflows/nightly.yml`)**: Daily automated run at 02:17 UTC executing `test:golden`, `verify:invariants`, and `npm audit --omit=dev --audit-level=high`.

## Vitest Workspace Projects

Vitest executes unit tests across multi-project configurations in `vitest.config.mjs`:

- **`tools`**: Verification CLI, invariants checker, build target logic (`tools/tests/**/*.test.mjs`).
- **`packages`**: Pure TypeScript domain logic, data contracts, astronomy provider, and theme system (`packages/*/tests/**/*.test.ts`).
- **`app`**: Web application helper functions, early theme application, DOM integration (`apps/app/tests/**/*.test.ts`, happy-dom environment).
- **`build`**: Post-build distribution validation and security header tests (`tools/tests-build/**/*.test.mjs`).
- **`golden`**: Full 2,814 city-day astronomical regression tests (`packages/engine/tests-golden/**/*.test.ts`).

## Local Pages Preview (`preview:pages`)

The `preview:pages` script (`node tools/preview-app.mjs`) starts an HTTP static file server on port 4173 serving `apps/app/dist/pages` under the GitHub Pages base path `/arunodaya-solar-events/`. It serves the production build with real MIME types (HTML, JS, CSS, SVG) and security headers matching GitHub Pages hosting.

## Android Tooling Policy

Android tooling (Android SDK, Gradle, Capacitor CLI, Jetpack Glance) is not required in Prompt 1 (Foundation) and will be introduced in Prompt 10 (Android shell and bridge) and Prompt 11 (Widgets).
