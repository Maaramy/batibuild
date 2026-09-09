// Learn more: https://docs.expo.dev/guides/monorepos/
const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, "..");

const config = getDefaultConfig(projectRoot);

// 1. Watch all files within the monorepo so shared modules
//    (src/convex/_generated, src/convex/projectTypes.ts, ...) can be imported.
config.watchFolders = [workspaceRoot];

// 2. Let Metro resolve modules installed in the mobile workspace first,
//    then fall back to the workspace root.
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(workspaceRoot, "node_modules"),
];

// 3. Force a single copy of React / React Native to avoid duplicate bundles.
config.resolver.disableHierarchicalLookup = false;

module.exports = config;