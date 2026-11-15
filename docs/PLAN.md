# Arunodaya Implementation Plan

The project executes across a sequenced delivery plan.

| Prompt | Name                          | Status   | Scope Description                                                                                                     |
| ------ | ----------------------------- | -------- | --------------------------------------------------------------------------------------------------------------------- |
| 1      | Foundation                    | COMPLETE | Rules, docs, npm-workspaces monorepo, quality gates, invariants checker, app shell, CI and GitHub Pages deploy.       |
| 1b     | Repair                        | COMPLETE | Invariants scanner real repo coverage, spec alignment to v2 contract, workflow lint, CodeQL and Dependabot hardening. |
| 1c     | CI repair                     | COMPLETE | Linux CI reproduction and fix, verify:linux Docker script, CodeQL default mode alignment, readable verify CI logs.    |
| 2      | Contracts and time core       | PENDING  | Data contracts, epoch-millisecond instant model, strict IST timezone handling, and time formatting utilities.         |
| 3      | Astronomy engine and snapshot | PENDING  | Solar algorithms, sunrise/sunset, Navkarshi derivation, day/night division, and shared snapshot generator.            |
| 4      | Theme system (10 themes)      | PENDING  | Contrast-checked theme tokens, color palettes, and theme registry with CSS custom properties.                         |
| 5      | App shell and Home            | PENDING  | React application setup, Georgia prominent numerical typography, home screen layout, and rolling digit odometer.      |
| 6      | Location                      | PENDING  | Geolocation adapter, offline India city database, coordinate search, and manual selection fallback.                   |
| 7      | Screens and features          | PENDING  | Seven-day forecast, Astronomy view, date navigation, next moonrise, Settings view, and theme selector.                |
| 8      | Export and share              | PENDING  | Canvas/SVG share card export and monthly printable solar calendar PDF generation.                                     |
| 9      | PWA and Pages hardening       | PENDING  | Service worker, Web App Manifest, offline caching, install prompts, and Lighthouse optimization.                      |
| 10     | Android shell and bridge      | PENDING  | Capacitor integration, Android wrapper, native bridge communication, and web asset bundling.                          |
| 11     | Widgets                       | PENDING  | Android AppWidget provider, Jetpack Glance layout implementations, and periodic alarm/update scheduling.              |
| 12     | Hardening and release         | PENDING  | Security review, performance profiling, final NOTICE and licence audit, and store release packaging.                  |
