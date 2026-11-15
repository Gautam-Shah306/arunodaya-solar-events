# Toolchain Specification

## Measured Environment

- **Node.js**: `v24.21.0` (native)
- **npm**: `11.19.0` (native)
- **Docker image**: not needed for local build/test (native Node satisfies `>=24 <25` and npm satisfies `>=11.10`)
- **Host OS**: Windows 11 (PowerShell 5.1+)
- **Host Repository Path**: Contains spaces (`D:\Sem4 vac\arunodaya-solar-events`)

## Pinned Dependencies

All dependencies are exact-pinned devDependencies located at the repository root. At runtime, the application uses ₹0 infrastructure with zero third-party runtime dependencies.

| Package               | Version   | Licence    | Purpose                                   |
| --------------------- | --------- | ---------- | ----------------------------------------- |
| `typescript`          | `6.0.3`   | Apache-2.0 | TypeScript compiler and language services |
| `vitest`              | `5.1.0`   | MIT        | Unit and integration test runner          |
| `@vitest/coverage-v8` | `5.1.0`   | MIT        | V8 code coverage provider                 |
| `eslint`              | `10.15.0` | MIT        | Static analysis linter                    |
| `@eslint/js`          | `10.0.1`  | MIT        | ESLint JavaScript recommendations         |
| `typescript-eslint`   | `8.72.2`  | MIT        | TypeScript AST rules for ESLint           |
| `prettier`            | `3.10.1`  | MIT        | Code formatting                           |
| `vite`                | `8.3.8`   | MIT        | Application bundler and dev server        |
| `@types/node`         | `26.6.6`  | MIT        | Node.js standard library type definitions |

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

## Linux CI Verification

Linux verification executes the quality pipeline inside the digest-pinned Linux Node container to reproduce and guard against Linux-specific CI regressions:

- **Digest-Pinned Image**: `node:24-bookworm-slim@sha256:dc26ae92c9fb15cf6b1d63e20f0944b2efe0f115b20e00be48fb23fceb061c54`
- **Behavior**: `npm run verify:linux` exports tracked and non-ignored files into a temporary directory, mounts it at `/work` with an isolated Docker volume for `/work/node_modules`, runs `npm ci && npm run verify`, and returns the container exit code.
- **Root Cause (Prompt 1c)**: Test failures on Linux were caused by non-portable Windows drive path resolution in the file walker and Vitest default timeouts under container CPU load. Path normalization was updated to use Windows path resolution portably when drive letters are present, and test timeouts were extended to 30s.

## Dependabot Policy

Dependabot runs weekly checks for `npm` and `github-actions`.

- **TypeScript Major Ignore**: Dependabot is configured to ignore `version-update:semver-major` for `typescript` because `typescript-eslint@8.72.2` requires TypeScript `<6.1.0`. Once `typescript-eslint` supports TypeScript 7+, this rule will be removed.
- **PR Rate Limiting**: `open-pull-requests-limit: 5` is configured for both ecosystems to prevent pull request storms and ensure reviewable updates.

## Android Tooling Policy

Android tooling (Android SDK, Gradle, Capacitor CLI, Jetpack Glance) is not required in Prompt 1 (Foundation) and will be introduced in Prompt 10 (Android shell and bridge) and Prompt 11 (Widgets).
