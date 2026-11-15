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
```

## Available Scripts

| Script              | Command                                                    | Purpose                                              |
| ------------------- | ---------------------------------------------------------- | ---------------------------------------------------- |
| `check:toolchain`   | `node tools/check-toolchain.mjs`                           | Validate Node.js and npm version constraints         |
| `verify:invariants` | `node tools/verify-invariants.mjs`                         | Verify AST architectural and security invariants     |
| `lint`              | `eslint .`                                                 | Run ESLint with TypeScript strict type-checked rules |
| `format`            | `prettier --write .`                                       | Format all source files with Prettier                |
| `format:check`      | `prettier --check .`                                       | Verify code formatting compliance                    |
| `typecheck`         | `node tools/typecheck.mjs`                                 | Run `tsc --noEmit` across all workspace projects     |
| `test`              | `vitest run --project=tools --project=packages`            | Run unit tests for tools and packages                |
| `test:coverage`     | `vitest run --coverage --project=tools --project=packages` | Enforce >=90% test coverage thresholds               |
| `build:pages`       | `node tools/build-app.mjs --target=pages`                  | Build web application for GitHub Pages               |
| `build:android`     | `node tools/build-app.mjs --target=android`                | Build web application for Android WebView container  |
| `test:build`        | `vitest run --project=build`                               | Verify built output integrity and CSP headers        |
| `verify`            | `node tools/verify.mjs`                                    | Execute the complete quality pipeline in sequence    |

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
│   └── workflows/           # CI, GitHub Pages, CodeQL, and Dependabot automation
├── LICENSE                  # MIT Licence
└── NOTICE                   # Attribution and licensing notice
```

## GitHub Pages Deployment

GitHub Pages deployment is fully automated via GitHub Actions in `.github/workflows/pages.yml`. When changes are pushed to `main`, the workflow executes `npm run verify`, builds the web application targeted for GitHub Pages (`/arunodaya-solar-events/`), and deploys the static artifact directly to GitHub Pages without generating branch clutter.

### First Push Setup

1. In your GitHub repository, navigate to **Settings** > **Pages**.
2. Under **Build and deployment** > **Source**, select **GitHub Actions**.
3. (Recommended) Under **Settings** > **Branches**, add a branch protection rule for `main` requiring status check `verify` to pass before merging.
