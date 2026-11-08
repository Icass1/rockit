import { spawnSync } from "node:child_process";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const fixtureUrl = "http://127.0.0.1:18899";
const env = {
    ...process.env,
    NEXT_PUBLIC_BACKEND_URL: fixtureUrl,
    EXPO_PUBLIC_BACKEND_URL: fixtureUrl,
    CI: "1",
    EXPO_NO_TELEMETRY: "1",
};
function run(cwd, args) {
    const result = spawnSync(process.execPath, args, {
        cwd: path.join(root, cwd),
        env,
        stdio: "inherit",
    });
    if (result.error) throw result.error;
    if (result.status) process.exit(result.status);
}
run("apps/web", ["node_modules/next/dist/bin/next", "build"]);
run("apps/mobile", [
    "node_modules/expo/bin/cli",
    "export",
    "--platform",
    "web",
    "--clear",
    "--source-maps",
]);
run(".", ["scripts/prepare-mobile-pwa.mjs"]);
run(".", ["scripts/check-mobile-bundle.mjs", "web"]);
