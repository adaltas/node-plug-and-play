import compat from 'eslint-plugin-compat';
import eslint from '@eslint/js';
import * as importPlugin from 'eslint-plugin-import';
import jsdoc from 'eslint-plugin-jsdoc';
import simpleImportSort from 'eslint-plugin-simple-import-sort';
import sortKeysFix from 'eslint-plugin-sort-keys-fix';
import tsdoc from 'eslint-plugin-tsdoc';
import typescriptSortKeys from 'eslint-plugin-typescript-sort-keys';
import babelParser from '@babel/eslint-parser';
import globals from 'globals';
import tsLint from 'typescript-eslint';
import sonarjs from 'eslint-plugin-sonarjs';
import eslintPluginUnicorn from 'eslint-plugin-unicorn';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';
import * as regexpPlugin from 'eslint-plugin-regexp';
import mochaPlugin from 'eslint-plugin-mocha';

import { fixupPluginRules, fixupConfigRules } from '@eslint/compat';

const tsConfig = 'tsconfig.json';
const tsEslintConfig = 'tsconfig.eslint.json';
const tsTestConfig = 'tsconfig.test.json';

export default tsLint.config(
  eslint.configs.recommended,
  ...tsLint.configs.recommendedTypeChecked,
  ...tsLint.configs.stylisticTypeChecked,
  ...fixupConfigRules(compat.configs['flat/recommended']),
  sonarjs.configs.recommended,
  eslintPluginUnicorn.configs['flat/recommended'],
  regexpPlugin.configs['flat/recommended'],
  eslintPluginPrettierRecommended,
  {
    ignores: [
      '**/node_modules/*',
      '**/vendor/*',
      '**/dist/*',
      '**/public/*',
      '**/build/*',
      '**/.history/*',
      '**/coverage/*',
      '**/.rollup.cache/*',
    ],
  },
  {
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
        // ...eslintrc.Legacy.environments.get('es2024'),
      },
    },
    plugins: {
      import: fixupPluginRules({ rules: importPlugin.rules }),
      jsdoc: jsdoc,
      'simple-import-sort': simpleImportSort,
      'sort-keys-fix': sortKeysFix,
    },

    rules: {
      'comma-dangle': [
        'error',
        {
          arrays: 'always-multiline',
          exports: 'always-multiline',
          functions: 'ignore',
          imports: 'always-multiline',
          objects: 'always-multiline',
        },
      ],

      // 'no-undef': 'warn',
      'func-names': 0,
      'import/first': 'error',
      // "import/newline-after-import": "error", // not compatible with flat config in eslint-plugin-import@2.29.1
      'import/no-duplicates': 'error',
      'import/no-extraneous-dependencies': [
        'error',
        {
          devDependencies: [
            '**/rollup.config.ts',
            '**/rollup.config.js',
            '**/eslint.config.js',
            'test/**/*.ts',
          ],
        },
      ],
      'unicorn/prevent-abbreviations': 'warn',
      'unicorn/catch-error-name': 'warn',
      'jsdoc/require-jsdoc': [
        'warn',
        {
          contexts: [
            'TSInterfaceDeclaration',
            'TSTypeAliasDeclaration',
            'TSEnumDeclaration',
            'TSPropertySignature',
          ],
          enableFixer: false,
          publicOnly: {
            cjs: true,
            esm: true,
            window: true,
          },
          require: {
            ArrowFunctionExpression: true,
            ClassDeclaration: true,
            // ClassExpression: true,
            FunctionDeclaration: true,
            // FunctionExpression: true,
            // MethodDefinition: true,
          },
        },
      ],
      // 'no-console': process.env.NODE_ENV === 'production' ? 'error' : 'off',
      'no-console': 'off',
      'no-debugger': process.env.NODE_ENV === 'production' ? 'error' : 'off',
      'no-param-reassign': [
        'error',
        {
          ignorePropertyModificationsFor: ['state'],
          props: true,
        },
      ],

      'no-underscore-dangle': 0,
      'simple-import-sort/exports': 'error',
      'simple-import-sort/imports': 'error',
      'sort-keys-fix/sort-keys-fix': 'warn',
    },
    settings: {
      'import/parsers': {
        espree: ['.js', '.cjs', '.mjs', '.jsx'],
      },
      'import/resolver': {
        node: true,
      },
    },
  },
  {
    files: ['**/*.ts', '**/*.tsx'],
    ...jsdoc.configs['flat/recommended-typescript'],
    ...importPlugin.configs.typescript,
    languageOptions: {
      parser: tsLint.parser,
      parserOptions: {
        project: [tsConfig, tsEslintConfig],
        tsconfigRootDir: import.meta.dirname,
      },
    },

    plugins: {
      '@typescript-eslint': tsLint.plugin,
      tsdoc: tsdoc,
      'typescript-sort-keys': typescriptSortKeys,
    },
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'warn', // or "error"
        {
          argsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
        },
      ],
      'tsdoc/syntax': 'warn',
      'typescript-sort-keys/interface': 'warn',
      'typescript-sort-keys/string-enum': 'warn',
    },
    settings: {
      'import/resolver': {
        typescript: {},
      },
      jsdoc: {
        mode: 'typescript',
      },
      'import/parsers': {
        '@typescript-eslint/parser': ['.ts'],
      },
    },
  },
  {
    files: ['test/**/*.ts'],
    ...mochaPlugin.configs.flat.recommended,

    languageOptions: {
      parserOptions: {
        project: [tsTestConfig, tsEslintConfig],
      },
    },
  },
  {
    files: ['**/*.js', '**/*.mjs'],
    ...jsdoc.configs['flat/recommended'],
    languageOptions: {
      parser: babelParser,
      parserOptions: {
        requireConfigFile: false,
        babelOptions: {
          babelrc: false,
          configFile: false,
          presets: ['@babel/preset-env'],
        },
      },
    },
  }
);
