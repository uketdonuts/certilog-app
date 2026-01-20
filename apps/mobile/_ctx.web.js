// Expo Router web ctx shim for this monorepo.
// Uses a stable './app' path so webpack can resolve require.context() reliably.

export const ctx = require.context(
  './app',
  true,
  /^(?:\.\/)(?!(?:(?:(?:.*\+api)|(?:\+(html|native-intent))))\.[tj]sx?$).*(?:\.android|\.ios|\.native)?\.[tj]sx?$/
);
