# ADR 0016: Real-Browser End-to-End Testing with Playwright Core

## Status

Accepted

## Context

In Prompt 6, the initial implementation of the rolling digits component passed every synthetic DOM-level unit test (in Happy DOM), yet failed to execute animations visually in a real browser: CSS animations did not restart when identical CSS class names remained on the element, and browser-level layout geometry could not be verified in headless node environments.

Unit test environments lack:

1. Live layout and computed style engines (advance width measurements, clip-path insets, font metrics).
2. Web Animations API (`element.getAnimations()`) tracking actual running CSS keyframe animations.
3. Content Security Policy enforcement across worker instantiation and resource fetches.
4. Font face loading status via `document.fonts`.

## Decision

1. **Tooling Choice**:
   - `playwright-core` (Apache-2.0, exact-pinned) is introduced as the single new development dependency. Full `@playwright/test` test runner is not added; tests execute as a Vitest project named `e2e`.
   - Browser binaries (Chromium) are installed to the standard local Playwright cache directory via `npm run e2e:install` and are never committed to the repository.
2. **Architecture**:
   - Built assets (`apps/app/dist/pages`) are served via Vite's preview JavaScript API (`tools/lib/preview.mjs`) on localhost with exact production Content Security Policy headers.
   - Tests execute in Chromium via `tools/tests-e2e/*.e2e.test.mjs`.
   - `element.getAnimations()` is queried directly on DOM nodes to verify running CSS keyframe animations (name, direction, playback state, and restart behavior).
3. **Execution Boundary**:
   - E2E tests are **not** part of `npm run verify` or `npm run verify:linux` (the lightweight Linux verification container lacks a full graphical browser stack).
   - E2E tests execute via `npm run test:e2e` locally, and in a dedicated GitHub Actions workflow (`.github/workflows/e2e.yml`) on `ubuntu-latest`.
   - The E2E workflow does not block GitHub Pages deployment.
4. **Artifacts**:
   - Test screenshots and visual regression captures are saved to `.scratch/e2e/` (ignored by git) and uploaded as build artifacts in the CI workflow.

## Consequences

- Comprehensive visual and functional verification of CSS animations, typography advance widths, and theme rendering.
- Zero impact on regular verification pipeline speed (`npm run verify` remains fast and headless).
