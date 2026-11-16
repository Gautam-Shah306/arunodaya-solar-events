import { defineConfig } from 'vitest/config';
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
      ],
      thresholds: {
        statements: 90,
        branches: 90,
        functions: 90,
        lines: 90,
      },
    },
  },
});
