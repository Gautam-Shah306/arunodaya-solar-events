import js from '@eslint/js';
import reactHooks from 'eslint-plugin-react-hooks';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: [
      '**/dist/**',
      '**/coverage/**',
      '**/node_modules/**',
      '**/.vite/**',
      '**/*.d.ts',
      '**/.scratch/**',
      'apps/app/public/**',
    ],
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
    files: ['apps/app/**/*.tsx'],
    plugins: {
      'react-hooks': reactHooks,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
    },
  },
  {
    files: ['apps/**/*', 'packages/**/*'],
    rules: {
      'no-console': 'error',
    },
  },
  {
    files: ['**/tests/**', '**/*.test.*'],
    rules: {
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
      '@typescript-eslint/no-confusing-void-expression': 'off',
      '@typescript-eslint/require-await': 'off',
      '@typescript-eslint/unbound-method': 'off',
    },
  },
  {
    files: ['tools/**/*'],
    rules: {
      'no-console': 'off',
    },
  },
);
