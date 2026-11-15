# ADR 0002: GitHub Pages via GitHub Actions with a Project Base Path

## Status

Accepted

## Context

Arunodaya is deployed to GitHub Pages at `https://gautam-shah306.github.io/arunodaya-solar-events/`. Web applications deployed under a GitHub repository path require all asset URLs and routing base paths to be prefixed with the repository subpath `/arunodaya-solar-events/`. In contrast, Android web assets packaged inside an APK require relative paths (`./`), and local development runs at the root (`/`).

## Decision

1. Deploy to GitHub Pages exclusively through GitHub Actions (`.github/workflows/pages.yml`), uploading the pre-built static artifact `apps/app/dist/pages`.
2. Configure build targets dynamically via `tools/lib/build-targets.mjs`:
   - `pages`: base path `/arunodaya-solar-events/`
   - `android`: base path `./`
   - `dev`: base path `/`
3. Inject a strict Content Security Policy (`CSP_POLICY`) as a `<meta>` tag into built HTML artifacts, while leaving development HTML untouched.

## Consequences

- Guaranteed zero broken asset paths across GitHub Pages, Android local WebView, and local development.
- Secure, reproducible deployment without legacy `gh-pages` branch commits.
- Strict CSP enforced at build time prevents unwanted network access, inline scripts, or remote assets.
