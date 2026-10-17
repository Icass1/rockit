import { defineConfig } from "tsup";

export default defineConfig({
    entry: ["tests/collectionTree.test.ts"],
    format: ["cjs"],
    outDir: ".test-build",
    removeNodeProtocol: false,
    clean: true,
});
