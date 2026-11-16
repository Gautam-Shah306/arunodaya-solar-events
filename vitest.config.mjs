import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: 'tools',
          environment: 'node',
          include: ['tools/tests/**/*.test.{mjs,js,ts}'],
          testTimeout: 30000,
        },
      },
      {
        test: {
          name: 'packages',
          environment: 'node',
          include: ['packages/*/tests/**/*.test.{mjs,js,ts}'],
          testTimeout: 30000,
        },
      },
      {
        test: {
          name: 'app',
          environment: 'node',
          include: ['apps/app/tests/**/*.test.{mjs,js,ts}'],
          testTimeout: 30000,
        },
      },
      {
        test: {
          name: 'build',
          environment: 'node',
          include: ['tools/tests-build/**/*.test.{mjs,js,ts}'],
          testTimeout: 180000,
        },
      },
      {
        test: {
          name: 'golden',
          environment: 'node',
          include: ['packages/engine/tests-golden/**/*.test.ts'],
          testTimeout: 300000,
        },
      },
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['tools/lib/**', 'packages/*/src/**'],
      exclude: [
        // CLI entry files are tested via end-to-end command-line executions rather than unit-level code coverage
        'tools/*.mjs',
        // App shell presentation is verified via integration and build-output tests in Prompt 1; comprehensive UI tests arrive with React in Prompt 5
        'apps/app/src/**',
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
