/**
 * Vitest project configurations shared between vitest.config.mjs and test inventory audit.
 */
export const TEST_PROJECTS = [
  {
    name: 'tools',
    environment: 'node',
    include: ['tools/tests/**/*.test.{mjs,js,ts}'],
    testTimeout: 30000,
  },
  {
    name: 'packages',
    environment: 'node',
    include: ['packages/*/tests/**/*.test.{mjs,js,ts}'],
    testTimeout: 30000,
  },
  {
    name: 'app',
    environment: 'happy-dom',
    include: ['apps/app/tests/**/*.test.{mjs,js,ts,tsx}'],
    testTimeout: 30000,
  },
  {
    name: 'build',
    environment: 'node',
    include: ['tools/tests-build/**/*.test.{mjs,js,ts}'],
    testTimeout: 180000,
  },
  {
    name: 'golden',
    environment: 'node',
    include: ['packages/engine/tests-golden/**/*.test.ts'],
    testTimeout: 300000,
  },
];
