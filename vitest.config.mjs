import { defineConfig } from 'vitest/config';
import { buildVitestThresholds } from './tools/lib/coverage-gates.mjs';
import { TEST_PROJECTS } from './tools/lib/test-projects.mjs';

export default defineConfig({
  define: {
    __AR_DEBUG__: true,
  },
  test: {
    projects: TEST_PROJECTS.map((proj) =>
      proj.name === 'app'
        ? {
            define: {
              __AR_DEBUG__: true,
            },
            test: proj,
          }
        : {
            test: proj,
          },
    ),
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['tools/lib/**', 'packages/*/src/**', 'apps/app/src/**'],
      exclude: [
        // Stylesheet files contain CSS rules and no executable JavaScript runtime statements
        '**/*.css',
        // Font binary files contain typography data and no executable JavaScript runtime statements
        '**/*.woff2',
        // Plain text license files contain no executable JavaScript runtime statements
        '**/*.txt',
        // Pure re-export entry module for astronomy subpath containing no runtime statements
        'packages/engine/src/astro/index.ts',
        // CLI entry files are tested via end-to-end command-line executions rather than unit-level code coverage
        'tools/*.mjs',
        // Candidates were benchmark evaluation adapters in Prompt 3, not runtime library code
        'tools/lib/candidates/**',
        // Main browser application entry mounts React root into DOM
        'apps/app/src/main.tsx',
        // Visual theme gallery page is tested via build and manual visual inspection
        'apps/app/src/themes-gallery.ts',
        // Visual component gallery review page is tested via build and manual visual inspection
        'apps/app/src/components-gallery.tsx',
        // Dedicated Web Worker entry delegates execution to request-handler module
        'apps/app/src/snapshot/snapshot.worker.ts',
        // Type-only contracts definition module with no runtime statements
        'packages/contracts/src/ev.ts',
        // Type-only astronomy types module with no runtime statements
        'packages/engine/src/astro/types.ts',
        // Ambient TypeScript declarations for Vite build environment
        'apps/app/src/env.d.ts',
      ],
      thresholds: {
        ...buildVitestThresholds(),
      },
    },
  },
});
