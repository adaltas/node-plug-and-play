const tsConfig = require('./tsconfig.json');
// const tsTestConfig = require('./tsconfig.test.json');
module.exports = {
  parserOptions: {
    ecmaVersion: 2018,
    sourceType: 'module',
  },
  overrides: [
    {
      extends: [
        'eslint:recommended',
        'plugin:@typescript-eslint/recommended',
        'plugin:@typescript-eslint/recommended-requiring-type-checking',
      ],
      files: tsConfig.include,
      parser: '@typescript-eslint/parser',
      parserOptions: {
        project: ['./tsconfig.json'],
      },
      plugins: ['@typescript-eslint/eslint-plugin', 'eslint-plugin-tsdoc'],
    },
  ],
  ignorePatterns: ['sample', '**/node_modules/*.[tj]s', '**/dist/**/*.[tj]s'],
};
