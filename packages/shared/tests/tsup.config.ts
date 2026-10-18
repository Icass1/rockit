import { defineConfig } from "tsup";

export default defineConfig({
    entry: [
        "tests/collectionTree.test.ts",
        "tests/playbackSync.test.ts",
        "tests/notifications.test.ts",
    ],
    format: ["cjs"],
    outDir: ".test-build",
    removeNodeProtocol: false,
    clean: true,
});
