const baseConfig = require('@backstage/cli/config/eslint-factory')(__dirname);
module.exports = {
  ...baseConfig,
  ignorePatterns: [...(baseConfig.ignorePatterns || []), 'dist-standalone'],
  overrides: [
    ...(baseConfig.overrides || []),
    {
      files: ['**/*.ts', '**/*.tsx'],
      rules: {
        '@backstage/no-mixed-plugin-imports': 'off',
      },
    },
    {
      files: ['vite.config.ts'],
      rules: {
        'no-restricted-imports': 'off',
      },
    },
  ],
};
