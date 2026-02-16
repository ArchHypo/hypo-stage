const baseConfig = require('@backstage/cli/config/eslint-factory')(__dirname);
module.exports = {
  ...baseConfig,
  overrides: [
    ...(baseConfig.overrides || []),
    {
      files: ['**/*.ts', '**/*.tsx'],
      rules: {
        '@backstage/no-mixed-plugin-imports': 'off',
      },
    },
  ],
};
