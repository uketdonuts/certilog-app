const path = require('path');
const webpack = require('webpack');
const createExpoWebpackConfigAsync = require('@expo/webpack-config');

module.exports = async function (env, argv) {
  const config = await createExpoWebpackConfigAsync(env, argv);

  const monorepoRoot = path.resolve(__dirname, '..', '..');

  // Configure aliases
  config.resolve = config.resolve || {};
  config.resolve.alias = {
    ...(config.resolve.alias || {}),
    // Replace the problematic _ctx.web.js with our custom version
    [path.join(monorepoRoot, 'node_modules', 'expo-router', '_ctx.web.js')]:
      path.resolve(__dirname, 'lib', 'expo-router-ctx.web.js'),
    // Add @ alias for project root (matching tsconfig paths)
    '@': path.resolve(__dirname),
    // Force single React instance to avoid "Invalid hook call" errors in monorepo
    'react': path.resolve(__dirname, 'node_modules', 'react'),
    'react-dom': path.resolve(__dirname, 'node_modules', 'react-dom'),
    // Fix nanoid/non-secure to use ESM version instead of CJS
    'nanoid/non-secure': path.join(monorepoRoot, 'node_modules', 'nanoid', 'non-secure', 'index.js'),
  };

  // Webpack 5 no longer polyfills Node core modules by default.
  config.resolve.fallback = {
    ...(config.resolve.fallback || {}),
    crypto: false,
  };

  return config;
};
