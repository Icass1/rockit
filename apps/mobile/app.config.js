const baseConfig = require("./app.json").expo;

const isDevelopment = process.env.APP_VARIANT === "development";

module.exports = {
    ...baseConfig,
    name: isDevelopment ? "RockIt! Dev" : baseConfig.name,
};
