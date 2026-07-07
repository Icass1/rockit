// @ts-check
import { defineConfig } from "eslint/config";

const eslintConfig = defineConfig([
    {
        files: ["src/**/*.ts", "src/**/*.tsx"],
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
