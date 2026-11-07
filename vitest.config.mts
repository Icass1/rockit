import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
    resolve: {
        alias: [
            { find: "@mobile", replacement: path.resolve("apps/mobile") },
            {
                find: /^@rockit\/theme$/,
                replacement: path.resolve("packages/theme/src/index.ts"),
            },
            {
                find: /^@rockit\/ui$/,
                replacement: path.resolve("packages/ui/src/index.ts"),
            },
            {
                find: /^@rockit\/shared$/,
                replacement: path.resolve("packages/shared/src/index.ts"),
            },
            {
                find: /^@\//,
                replacement: path.resolve("packages/shared/src") + "/",
            },
        ],
    },
    test: {
        include: ["tests/frontend/{unit,components}/**/*.test.{ts,tsx}"],
        environment: "node",
        env: { NEXT_PUBLIC_BACKEND_URL: "http://fixture.invalid" },
        restoreMocks: true,
        unstubGlobals: true,
        reporters: ["default", "json"],
        outputFile: { json: ".test-build/frontend/unit-results.json" },
    },
});
