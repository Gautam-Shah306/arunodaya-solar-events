# Toolchain Specification

## Measured Environment

- **Node.js**: `v24.21.0` (native)
- **npm**: `11.19.0` (native)
- **Docker image**: not needed (native Node satisfies `>=24 <25` and npm satisfies `>=11.10`)
- **Host OS**: Windows 11 (PowerShell 5.1+)

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
| `github/codeql-action`          | `v4`          | `v4.39.3`        |

## Docker Reference Command (PowerShell-safe)

When Docker execution is required on environments lacking native Node 24:

```powershell
docker run --rm -v ($pwd.Path + ':/work') -v arunodaya-node-modules:/work/node_modules -w /work node:24-bookworm-slim@sha256:<digest> npm ci
```

## Android Tooling Policy

Android tooling (Android SDK, Gradle, Capacitor CLI, Jetpack Glance) is not required in Prompt 1 (Foundation) and will be introduced in Prompt 10 (Android shell and bridge) and Prompt 11 (Widgets).
