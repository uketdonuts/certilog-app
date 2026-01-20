// Shim for Expo Router on web in this monorepo.
// The upstream module relies on process.env.EXPO_ROUTER_APP_ROOT, which can become
// a brittle relative path when node_modules is hoisted at the workspace root.
// Using a stable relative path from within the mobile package fixes webpack resolution.

export const ctx = require.context(
  '../app',
  true,
  /^(?:\.\/)(?!(?:(?:(?:.*\+api)|(?:\+(html|native-intent))))\.[tj]sx?$).*(?:\.android|\.ios|\.native)?\.[tj]sx?$/
);
