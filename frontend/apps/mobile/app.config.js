const baseConfig = require("./app.json").expo;

const isDevelopment = process.env.APP_VARIANT === "development";

module.exports = {
    ...baseConfig,
    name: isDevelopment ? "RockIt! Dev" : baseConfig.name,
    scheme: isDevelopment ? "mobile-dev" : baseConfig.scheme,
    android: {
        ...baseConfig.android,
        package: isDevelopment ? "com.rockit.mobile.dev" : baseConfig.android.package,
    },
    ios: {
        ...baseConfig.ios,
        bundleIdentifier: isDevelopment
            ? "com.rockit.mobile.dev"
            : baseConfig.ios.bundleIdentifier,
    },
};
