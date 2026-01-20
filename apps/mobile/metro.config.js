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

module.exports = config;
