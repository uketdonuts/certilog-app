const path = require('path');
const { spawn } = require('child_process');

const projectRoot = path.resolve(__dirname, '..');
const monorepoRoot = path.resolve(projectRoot, '..', '..');

const toPosixPath = (p) => p.replace(/\\/g, '/');

// Expo Router uses this env var on web to know where the `app/` directory is.
// In monorepos, the _ctx.web.js file is at monorepoRoot/node_modules/expo-router/
// and we need a relative path from there to apps/mobile/app
process.env.EXPO_PROJECT_ROOT = projectRoot;

const appDir = path.join(projectRoot, 'app');
const expoRouterDir = path.join(monorepoRoot, 'node_modules', 'expo-router');
const relativePath = path.relative(expoRouterDir, appDir);
// Ensure path starts with ./ for require.context and is POSIX-style
const posixRelativePath = toPosixPath(relativePath);
process.env.EXPO_ROUTER_APP_ROOT = posixRelativePath.startsWith('.')
  ? posixRelativePath
  : './' + posixRelativePath;

console.log('EXPO_ROUTER_APP_ROOT:', process.env.EXPO_ROUTER_APP_ROOT);

const extraArgs = process.argv.slice(2);

// Use a shell invocation for maximum Windows compatibility (npx.cmd is a batch file).
const command = ['npx', 'expo', 'start', '--web', ...extraArgs]
  .map((part) => (part.includes(' ') ? `"${part}"` : part))
  .join(' ');

const child = spawn(command, {
  cwd: projectRoot,
  env: process.env,
  stdio: 'inherit',
  shell: true,
});

child.on('exit', (code) => process.exit(code ?? 0));
