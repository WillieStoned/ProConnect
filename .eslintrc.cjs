module.exports = {
  root: true,
  ignorePatterns: [
    '**/node_modules/**',
    'Server/uploads/**',
  ],
  env: {
    es2022: true,
  },
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'script',
  },
  overrides: [
    {
      files: ['Server/**/*.js', 'scripts/**/*.js'],
      env: {
        node: true,
      },
      rules: {
        'no-undef': 'error',
        'no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
        eqeqeq: ['error', 'always'],
      },
    },
    {
      files: ['Client/**/*.js'],
      env: {
        browser: true,
      },
      globals: {
        API: 'readonly',
        toggleTheme: 'readonly',
      },
      rules: {
        'no-undef': 'error',
        'no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
        eqeqeq: ['error', 'always'],
      },
    },
  ],
};
