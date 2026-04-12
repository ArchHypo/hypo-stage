/**
 * Root ESLint flat config for scripts (Node JS).
 * Workspace packages use their own config (backstage-cli).
 * Run via: yarn lint:root (called from yarn lint).
 */
import js from '@eslint/js';

export default [
  {
    files: ['scripts/**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'script',
      globals: {
        require: 'readonly',
        module: 'readonly',
        exports: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        process: 'readonly',
        console: 'readonly',
        Buffer: 'readonly',
      },
    },
    rules: {
      ...js.configs.recommended.rules,
      'no-console': 'off',
    },
  },
];
