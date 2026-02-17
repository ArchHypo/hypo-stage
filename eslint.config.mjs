/**
 * Root ESLint flat config for e2e (Playwright JS) and scripts (Node JS).
 * Workspace packages use their own config (backstage-cli).
 * Run via: yarn lint:root (called from yarn lint).
 */
import js from '@eslint/js';
import playwright from 'eslint-plugin-playwright';

const playwrightRecommended = playwright.configs['flat/recommended'];

export default [
  // E2E: Playwright (JavaScript)
  {
    files: ['e2e/**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      ...playwrightRecommended.languageOptions,
    },
    plugins: playwrightRecommended.plugins,
    rules: playwrightRecommended.rules,
  },
  // Scripts: Node JS
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
