const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, "../..");

const config = getDefaultConfig(projectRoot);

config.watchFolders = [workspaceRoot];

config.resolver.nodeModulesPaths = [
    path.resolve(projectRoot, "node_modules"),
    path.resolve(workspaceRoot, "node_modules"),
];

config.resolver.alias = {
    "@/dto": path.resolve(__dirname, "../../packages/shared/src/dto"),
    "@/models": [
        path.resolve(__dirname, "../../packages/shared/src/models"),
        path.resolve(__dirname, "../../apps/mobile/models"),
    ],
};

module.exports = config;
