import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: ['**/dist/**', '**/coverage/**', '**/node_modules/**', '**/.vite/**', '**/*.d.ts'],
  },
  js.configs.recommended,
  ...tseslint.configs.strictTypeChecked.map((conf) => ({
    ...conf,
    files: ['**/*.ts', '**/*.tsx'],
  })),
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
      globals: {
        process: 'readonly',
        console: 'readonly',
        URL: 'readonly',
        Buffer: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
      },
    },
    rules: {
      eqeqeq: ['error', 'always'],
      'prefer-const': 'error',
    },
  },
  {
    files: ['**/*.ts', '**/*.tsx'],
    rules: {
      'no-undef': 'off',
      '@typescript-eslint/no-floating-promises': 'error',
    },
  },
  {
    files: ['apps/**/*', 'packages/**/*'],
    rules: {
      'no-console': 'error',
    },
  },
  {
    files: ['tools/**/*'],
    rules: {
      'no-console': 'off',
    },
  },
);
