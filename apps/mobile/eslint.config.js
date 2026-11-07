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
                project: [
                    path.resolve(__dirname, "./tsconfig.json"),
                    path.resolve(__dirname, "./tsconfig.web.json"),
                ],
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
            "no-restricted-imports": [
                "error",
                {
                    patterns: [
                        {
                            group: ["./", "../"],
                            message:
                                "Relative imports are not allowed. Use absolute imports instead (e.g., @/components/..., @/lib/...)",
                        },
                    ],
                },
            ],
        },
        settings: {
            "import/resolver": [
                {
                    typescript: {
                        extensions: [
                            ".native.ts",
                            ".native.tsx",
                            ".web.ts",
                            ".web.tsx",
                            ".ts",
                            ".tsx",
                            ".js",
                            ".json",
                        ],
                        project: [
                            path.resolve(__dirname, "./tsconfig.json"),
                            path.resolve(__dirname, "./tsconfig.web.json"),
                        ],
                    },
                },
                {
                    node: {
                        extensions: [
                            ".native.ts",
                            ".native.tsx",
                            ".web.ts",
                            ".web.tsx",
                            ".js",
                            ".jsx",
                            ".ts",
                            ".tsx",
                            ".mjs",
                        ],
                    },
                },
            ],
        },
    },
]);
