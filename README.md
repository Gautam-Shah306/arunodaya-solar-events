# Arunodaya

> _“A little closer to the sun.”_

Arunodaya is an India-only, Android-first application showing sunrise, Navkarshi, sunset, and daily astronomy with live countdowns and home-screen widgets.

All displayed times and calculations adhere strictly to **Indian Standard Time (IST, UTC+05:30)** regardless of device configuration. The application operates with a ₹0 recurring infrastructure target: completely local astronomical calculations, no backend servers, no user accounts, no analytics, and no background location tracking.

- **Specification**: [docs/spec/ARUNODAYA-SPEC.md](docs/spec/ARUNODAYA-SPEC.md)
- **Implementation Plan**: [docs/PLAN.md](docs/PLAN.md)
- **Agent Rules**: [docs/AGENT-RULES.md](docs/AGENT-RULES.md)
- **Architecture**: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)
- **Toolchain**: [docs/TOOLCHAIN.md](docs/TOOLCHAIN.md)

## Quick Start (Windows PowerShell)

Requirements: Native Node.js `24.x` with `npm >= 11.10`.

```powershell
# Verify toolchain compatibility
npm run check:toolchain

# Install dependencies cleanly
npm ci

# Run all quality gates and build verification
npm run verify

# Verify full pipeline inside Linux Docker container (requires Docker)
npm run verify:linux
```

## Available Scripts

| Script               | Command                                                                  | Purpose                                                |
| -------------------- | ------------------------------------------------------------------------ | ------------------------------------------------------ |
| `check:toolchain`    | `node tools/check-toolchain.mjs`                                         | Validate Node.js and npm version constraints           |
| `verify:invariants`  | `node tools/verify-invariants.mjs`                                       | Verify AST architectural and security invariants       |
| `lint`               | `eslint .`                                                               | Run ESLint with TypeScript strict type-checked rules   |
| `format`             | `prettier --write .`                                                     | Format all source files with Prettier                  |
| `format:check`       | `prettier --check .`                                                     | Verify code formatting compliance                      |
| `typecheck`          | `node tools/typecheck.mjs`                                               | Run `tsc --noEmit` across all workspace projects       |
| `test`               | `vitest run --project=tools --project=packages --project=app`            | Run unit tests for tools, packages, and app            |
| `test:coverage`      | `vitest run --coverage --project=tools --project=packages --project=app` | Enforce >=90% test coverage thresholds                 |
| `test:tz`            | `node tools/test-tz.mjs`                                                 | Run unit tests across 6 timezones (UTC, IST, etc.)     |
| `test:golden`        | `vitest run --project=golden`                                            | Run full 2,814 city-day golden regression tests        |
| `build:pages`        | `node tools/build-app.mjs --target=pages`                                | Build web application for GitHub Pages                 |
| `build:android`      | `node tools/build-app.mjs --target=android`                              | Build web application for Android WebView container    |
| `preview:pages`      | `node tools/preview-app.mjs`                                             | Preview built GitHub Pages target locally on port 4173 |
| `test:build`         | `vitest run --project=build`                                             | Verify built output integrity and CSP headers          |
| `test:e2e`           | `node tools/test-e2e.mjs`                                                | Run real-browser Playwright E2E tests in Chromium      |
| `analyze:bundle`     | `node tools/bundle-report.mjs`                                           | Generate bundle report and chunk analysis              |
| `lint:workflows`     | `node tools/lint-workflows.mjs`                                          | Lint GitHub Actions workflows with actionlint          |
| `reference:generate` | `node tools/generate-reference.mjs`                                      | Generate Skyfield/PyEphem reference dataset in Docker  |
| `bench:astro`        | `node tools/bench-astro.mjs`                                             | Run empirical astronomy accuracy benchmark             |
| `verify`             | `node tools/verify.mjs`                                                  | Execute the complete quality pipeline in sequence      |
| `verify:linux`       | `node tools/verify-linux.mjs`                                            | Run quality pipeline in digest-pinned Linux container  |

### Pre-Commit Linux Verification

To verify that the exact staged tree passes all quality gates before committing:

```powershell
git add -A
npm run verify:linux -- --index
git commit -m "feat: your commit message"
```

Property-based testing is powered by `fast-check` (MIT, version 4.10.2). Repository files are strictly UTF-8 without BOM (enforced by `INV-BOM`).

Run the invariants checker with `--verbose` to inspect scanned file breakdowns for each rule:

```powershell
npm run verify:invariants -- --verbose
```

## Repository Layout

```text
arunodaya-solar-events/
├── apps/
│   └── app/                 # Web/PWA application shell and future Capacitor host
├── packages/
│   ├── contracts/           # Data contracts, schema versioning, models
│   ├── engine/              # Pure astronomical math and IST time logic
│   └── themes/              # Color palettes, theme tokens, contrast validation
├── docs/
│   ├── adr/                 # Architecture Decision Records
│   ├── spec/                # Authoritative product specification
│   ├── AGENT-RULES.md       # Inviolable agent operating rules (R1-R12)
│   ├── ARCHITECTURE.md      # Layer boundaries and invariant mapping
│   ├── PLAN.md              # 12-prompt delivery roadmap
│   └── TOOLCHAIN.md         # Measured runtime and dependency versions
├── tools/                   # Quality gates, verification CLI, build scripts
├── .github/
│   └── workflows/           # CI, GitHub Pages, and Dependabot automation
├── LICENSE                  # MIT Licence
└── NOTICE                   # Attribution and licensing notice
```

## CI/CD and Automation

- **Quality Suite (`.github/workflows/ci.yml`)**: Continuous integration running the 11-step verification pipeline on push and pull request.
- **Nightly Golden Suite (`.github/workflows/nightly.yml`)**: Scheduled daily verification (02:17 UTC) running full golden tests (`test:golden`), invariant validation, and high-severity production dependency security audits (`npm audit --omit=dev --audit-level=high`).
- **Code Scanning**: CodeQL analysis runs through GitHub's default setup (Settings > Code security) with no custom workflow in the repository; a custom workflow must not be added while the default setup is on.
- **Pages Deployment (`.github/workflows/pages.yml`)**: Automated deployment of the static web app to GitHub Pages.
- **Dependabot (`.github/dependabot.yml`)**: Automated dependency scanning with dedicated grouping for `astronomy-engine` and major-version pin protection.

## Astronomy Provider and Golden Verification

The core astronomical calculations are provided by `astronomy-engine` (MIT, version 2.1.19), encapsulated under `packages/engine/src/astro/` via a path-scoped dependency allowance (`INV-LAYERS`). All astronomical calculations are verified against a committed reference dataset of 2,814 city-days (`packages/engine/tests/data/astro-reference-v1.json`) generated using NASA JPL DE440s ephemerides via Skyfield with PyEphem cross-checking. Accuracy tolerances and tight regression guards are defined once in `packages/engine/tests/data/astro-tolerances-v1.json`.

## Themes and Contrast Validation

Arunodaya ships eight curated themes (four built-in: Light, Dark, Pure Dark, Darker; four theme packs: Navy, Burgundy, Porcelain, Sandstone) designed around high-contrast editorial and dark aesthetics. Pure Dark layers equal pure black with a border for separation; light themes use light widget surfaces. Every theme is defined as typed data in `packages/themes` and enforced by an automated 46-point contrast gate in CI (`npm run test`):

- **Documentation & Token Reference**: [docs/THEMES.md](docs/THEMES.md)
- **Architecture & Contrast Decision**: [docs/adr/0011-theme-system.md](docs/adr/0011-theme-system.md)
- **Live Theme Gallery**: [https://gautam-shah306.github.io/arunodaya-solar-events/themes.html](https://gautam-shah306.github.io/arunodaya-solar-events/themes.html)

## Typography and Real-Browser Testing

Headings and countdown displays use bundled **Playfair Display** (OFL-1.1, weights 400 and 700) WOFF2 serif with lining figures (`lnum`) and calibrated slot styling (`--ar-digit-width: 1.06ch`). End-to-end rendering and rolling digit transitions are verified in real headless Chromium via Playwright (`npm run test:e2e`).

## GitHub Pages Deployment

GitHub Pages deployment is fully automated via GitHub Actions in `.github/workflows/pages.yml`. When changes are pushed to `main`, the workflow executes `npm run verify`, builds the web application targeted for GitHub Pages (`/arunodaya-solar-events/`), and deploys the static artifact directly to GitHub Pages without generating branch clutter.

### First Push Setup

1. In your GitHub repository, navigate to **Settings** > **Pages**.
2. Under **Build and deployment** > **Source**, select **GitHub Actions**.
3. (Recommended) Under **Settings** > **Branches**, add a branch protection rule for `main` requiring status check `verify` to pass before merging.
