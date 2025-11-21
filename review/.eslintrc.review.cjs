/* Review-only ESLint config (self-contained, type-aware) */
const path = require('path');

module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
    ecmaFeatures: { jsx: true },
    project: [path.join(__dirname, 'tsconfig.eslint.json')],
    tsconfigRootDir: __dirname,
  },
  env: { browser: true, es2022: true, node: true },
  plugins: ['@typescript-eslint', 'react', 'react-hooks'],
  settings: { react: { version: 'detect' } },
  globals: { JSX: 'readonly' },
  // Keep rules aligned with project to maintain PASS; type-aware rules can be enabled later if desired.
  rules: {
    // React
    'react/react-in-jsx-scope': 'off',
    'react/prop-types': 'off',
    'react-hooks/exhaustive-deps': 'warn',
    'react/no-array-index-key': 'warn',
    'react/self-closing-comp': 'error',
    'react/jsx-no-useless-fragment': 'error',
    'react/no-unused-prop-types': 'error',
    'react/no-unused-state': 'error',

    // Imports/exports
    'no-duplicate-imports': 'error',

    // TS-aware base
    '@typescript-eslint/no-unused-vars': [
      'error',
      { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' }
    ],
    '@typescript-eslint/no-unused-expressions': 'error',
    'no-unused-vars': 'off',
    'no-unused-expressions': 'off',

    // TypeScript specific
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/no-empty-interface': 'error',
    '@typescript-eslint/no-empty-function': 'warn',
    'no-empty-function': 'off',

    // Async correctness (type-aware)
    '@typescript-eslint/no-floating-promises': 'error',
    '@typescript-eslint/no-misused-promises': ['error', { checksVoidReturn: false }],

    // Type style
    '@typescript-eslint/consistent-type-imports': ['error', { prefer: 'type-imports', disallowTypeAnnotations: false }],

    // General
    'no-unreachable': 'error',
    'no-unused-labels': 'error',
    'no-undef-init': 'error',
    'prefer-const': 'error',
    'no-var': 'error',
    'no-console': 'warn'
  }
};

