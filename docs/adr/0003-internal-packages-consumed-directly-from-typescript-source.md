# ADR 0003: Internal Packages Consumed Directly from TypeScript Source

## Status

Accepted

## Context

In a TypeScript monorepo, internal packages often introduce build steps (e.g., generating `.d.ts` and `.js` in `dist/` folders) that require watch modes, complex build order sequencing, and cross-package linking during development. Because Arunodaya uses Vite and modern TypeScript with `moduleResolution: "bundler"`, tooling can resolve and compile TypeScript source files directly across workspace boundaries.

## Decision

Internal workspace packages (`@arunodaya/engine`, `@arunodaya/contracts`, `@arunodaya/themes`) export their entry points directly from TypeScript source (`./src/index.ts`) in their respective `package.json` files:

```json
"exports": {
  ".": "./src/index.ts"
}
```

No separate build/compile step is needed for internal packages. Vite and Vitest consume the `.ts` sources directly, and `tools/typecheck.mjs` verifies type safety across all packages using `tsc --noEmit`.

## Consequences

- Fast development feedback loops with zero rebuild delays.
- No stale build artifacts in package directories.
- Consistent language configuration across all packages through `tsconfig.base.json`.
