// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require("eslint/config");
const expoConfig = require("eslint-config-expo/flat");
const path = require("path");

module.exports = defineConfig([
    expoConfig,
    {
        ignores: ["dist/*"],
        languageOptions: {
            parserOptions: {
                project: path.resolve(__dirname, "./tsconfig.json"),
                tsconfigRootDir: __dirname,
            },
        },
        rules: {
            "import/no-unresolved": [
                "error",
                {
                    caseSensitive: false,
                },
            ],
        },
        settings: {
            "import/resolver": [
                {
                    typescript: {
                        project: path.resolve(__dirname, "./tsconfig.json"),
                    },
                },
                {
                    node: {
                        extensions: [".js", ".jsx", ".ts", ".tsx", ".mjs"],
                    },
                },
            ],
        },
    },
]);
