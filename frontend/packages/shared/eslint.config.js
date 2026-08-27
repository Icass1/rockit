// @ts-check
import tsParser from "@typescript-eslint/parser";
import { defineConfig, globalIgnores } from "eslint/config";

const eslintConfig = defineConfig([
    // src/dto is auto-generated (see `python3 -m backend models`) — never linted.
    globalIgnores(["src/dto/**"]),
    {
        files: ["src/**/*.ts", "src/**/*.tsx"],
        languageOptions: {
            parser: tsParser,
        },
        rules: {
            "no-restricted-imports": [
                "error",
                {
                    patterns: [
                        {
                            group: ["./", "../"],
                            message:
                                "Relative imports are not allowed. Use absolute imports instead (e.g., @/dto, @/lib/store)",
                        },
                    ],
                },
            ],
        },
    },
]);

export default eslintConfig;
