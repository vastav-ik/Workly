const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require('nativewind/metro');
const path = require("path");

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, "../..");

// Retrieve the default Expo config
const config = getDefaultConfig(projectRoot);

// 1. Watch all files in the monorepo
config.watchFolders = [workspaceRoot];

// 2. Set node_modules resolution paths for Metro
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(workspaceRoot, "node_modules"),
];

// 3. Enable package.json "exports" support in Metro (required for modern packages like @posthog/core)
config.resolver.unstable_enablePackageExports = true;

// Wrap the configuration with NativeWind and point it to your global CSS file
module.exports = withNativeWind(config, { input: './global.css' });
