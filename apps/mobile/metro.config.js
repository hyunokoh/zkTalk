const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// Watch the shared package and pnpm store for the mobile app
config.watchFolders = [
  monorepoRoot, // Need full monorepo for pnpm symlink resolution
];

// Resolve modules from both mobile's node_modules and root node_modules
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(monorepoRoot, 'node_modules'),
];

// Enable symlink resolution (critical for pnpm)
config.resolver.unstable_enableSymlinks = true;

module.exports = config;
