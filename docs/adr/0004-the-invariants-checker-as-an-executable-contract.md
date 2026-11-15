# ADR 0004: The Invariants Checker as an Executable Contract

## Status

Accepted

## Context

Arunodaya has strict non-negotiable guardrails defined in `docs/spec/ARUNODAYA-SPEC.md` and `docs/AGENT-RULES.md`:

- All times must be in IST (+05:30); no local device timezone APIs.
- Domain engines and contracts must be pure with zero clock or DOM dependencies.
- No network access at runtime (zero ₹ infrastructure budget).
- Strict layer import boundaries.
- No secrets, no wildcard or range dependency versions, and permissive open-source licences only.
- Strict LF line endings and mandatory documentation presence.

Manual code reviews and human vigilance are insufficient to guarantee these guardrails over multi-agent, multi-prompt development.

## Decision

We implement an automated invariants enforcement tool (`tools/verify-invariants.mjs`) executing AST-level checks via the TypeScript compiler API (`ts.createSourceFile`) rather than regex.
The tool validates 10 specific invariant rules:

- `INV-TIME`: Bans local-time methods outside `packages/engine/src/time/ist.ts`.
- `INV-CLOCK`: Bans direct system clock reading in domain core packages.
- `INV-COLOR`: Bans color literals outside `packages/themes`.
- `INV-NET`: Bans networking APIs and remote URLs.
- `INV-LAYERS`: Restricts cross-package dependencies and bans browser globals from engine/contracts.
- `INV-SECRETS`: Blocks sensitive files and private keys.
- `INV-DEPS`: Enforces exact version pinning.
- `INV-LICENSE`: Enforces permissive licence allowlist on production dependencies.
- `INV-LF`: Flags CRLF line endings.
- `INV-DOCS`: Verifies existence of required documentation.

Allowlisting requires explicit rationale of at least 10 characters in `tools/invariants.config.json`. The checker runs as part of the standard `npm run verify` quality gate.

## Consequences

- Guardrails are automatically verified on every verification run and CI pipeline.
- AST parsing prevents false positives in string literals and comments.
- Violations fail immediately with line numbers and clear corrective instructions.
