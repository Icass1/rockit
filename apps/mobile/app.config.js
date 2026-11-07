const baseConfig = require("./app.json").expo;

const tokens = require("../../packages/theme/src/tokens.json");

const isDevelopment = process.env.APP_VARIANT === "development";

module.exports = {
    ...baseConfig,
    name: isDevelopment ? "RockIt! Dev" : baseConfig.name,
    android: {
        ...baseConfig.android,
        adaptiveIcon: {
            ...baseConfig.android.adaptiveIcon,
            backgroundColor: tokens.themes.dark.background,
        },
    },
    plugins: baseConfig.plugins.map((plugin) =>
        Array.isArray(plugin) && plugin[0] === "expo-splash-screen"
            ? [
                  plugin[0],
                  {
                      ...plugin[1],
                      backgroundColor: tokens.themes.dark.background,
                      dark: {
                          ...plugin[1].dark,
                          backgroundColor: tokens.themes.dark.background,
                      },
                  },
              ]
            : plugin
    ),
};
