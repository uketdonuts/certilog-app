module.exports = {
  root: true,
  extends: ['expo'],
  rules: {
    // Metro + TS path aliases handle this at runtime; ESLint import resolver
    // frequently misfires in Expo monorepos.
    'import/no-unresolved': 'off',
    'import/namespace': 'off',
    'import/name': 'off',
  },
  overrides: [
    {
      files: ['*.js', '*.cjs', 'scripts/**/*.js'],
      env: { node: true },
    },
  ],
};
