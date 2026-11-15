# Agent Rules (R1–R12)

The following rules are mandatory for all agents and automated workflows operating in this repository.

## Rules

- **R1 Contract first.** `docs/spec/ARUNODAYA-SPEC.md` is the contract. Spec section 3.3 (rounding), section 15 (guardrails) and the privacy rules (no backend, accounts, analytics, background location) are inviolable. A conflict means STOP and ask.
- **R2 Never run git add, git commit, git push, git reset, git checkout or git stash.** Read-only git (status, diff, log, remote) is allowed. The user commits.
- **R3 Toolchain: Node 24.x with npm >= 11.10 natively, else the digest-pinned Docker image recorded in docs/TOOLCHAIN.md.** No other package manager. `package-lock.json` is committed; after it exists, install with `npm ci`.
- **R4 Windows and PowerShell safety: no double quotes inside native-command arguments (use single quotes); no && or || chaining; all repo scripts are Node .mjs files, never bash or batch; spawn npm with shell true only on win32 and only with fixed arguments; use path.join, never hard-coded separators; LF line endings everywhere.**
- **R5 Evidence over assertion: every claim in the REPORT is backed by a command and its output summary; anything not executed is UNVERIFIED.**
- **R6 Tests: one test per named scenario, with the test title equal to the scenario text verbatim.** No skipped or focused tests. Coverage gates are enforced by configuration so a missed gate fails the command.
- **R7 Privacy and supply chain: no network access at runtime, no analytics, no remote fonts, scripts or CDNs, no secrets or signing keys in the repo.** Dependencies are pinned to exact versions (save-exact), kept minimal, permissively licensed, and every new dependency is justified in the REPORT with its licence.
- **R8 Time rule: only packages/engine/src/time/ist.ts may use local-time APIs.** Instants are epoch milliseconds; IST is fixed +05:30. The pure packages never read the system clock; the clock is injected.
- **R9 Colour rule: no colour literals outside packages/themes; everything else uses tokens or CSS system-colour keywords.**
- **R10 Docs ride with code: behaviour or decision changes update the spec, ADRs and README in the same prompt.** Spec edits are minimal, listed in the REPORT with section numbers.
- **R11 Failure protocol: after two failed attempts at the same thing, stop retrying, record the exact command and error, and continue with the remaining independent work.**
- **R12 Scope: do only what the prompt asks.** No extra features, no refactors outside scope. Out-of-scope findings go under FOLLOW-UPS. Never modify LICENSE.

## Part 0 standard

Every subsequent prompt must begin with Part 0 verification to ensure workspace invariants and environment integrity:

1. Toolchain check: run `npm run check:toolchain`.
2. Clean install: run `npm ci`.
3. Comprehensive verification: run `npm run verify`.
4. Repair scope: repair only regressions or environment drift, never new features.
5. Reporting: report results in the REPORT section.
6. Linux verification: after Prompt 1c, when the prompt touches tests, tooling or workflows, also run `npm run verify:linux` and report it.

## Report format

Every prompt execution concludes with exactly one REPORT section containing:

1. **PART STATUS**: table with columns `Part`, `Status` (DONE/PARTIAL/SKIPPED/FAILED), and `Evidence` (one line of evidence).
2. **COMMANDS RUN**: each command, exit code, and verbatim test, coverage and lint summary lines.
3. **FILES**: created and modified, grouped by part.
4. **SPEC/DOC EDITS**: section number, before, after.
5. **DEVIATIONS**: deviations from prompt or contract, each with reason.
6. **UNVERIFIED**: anything not executed and why.
7. **FAILED ATTEMPTS**: exact command and exact error text.
8. **USER ACTIONS**: manual steps only the user can do.
9. **FOLLOW-UPS**: out-of-scope findings and recommendations.
