const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// Prevent Metro from walking up the filesystem and accidentally resolving
// workspace-root React/ReactDOM (common monorepo "Invalid hook call" cause).
config.resolver.disableHierarchicalLookup = true;

// Prefer the app's node_modules, but still allow resolving hoisted deps.
config.resolver.nodeModulesPaths = [
  path.join(projectRoot, 'node_modules'),
  path.join(workspaceRoot, 'node_modules'),
];

// Make monorepo packages (e.g. @certilog/shared) work with Metro.
config.watchFolders = [workspaceRoot];

// Polyfills for Node.js core modules (mqtt.js needs these)
const emptyShim = path.resolve(projectRoot, 'shims/empty.js');
config.resolver.extraNodeModules = {
  url: require.resolve('react-native-url-polyfill'),
  buffer: require.resolve('buffer/'),
  process: require.resolve('process/browser'),
  stream: require.resolve('readable-stream'),
  events: require.resolve('events/'),
  // Node.js modules not available in RN - shim them out (mqtt uses WebSocket, not these)
  dns: emptyShim,
  net: emptyShim,
  tls: emptyShim,
  fs: emptyShim,
  assert: emptyShim,
  util: require.resolve('util/'),
};

module.exports = config;
