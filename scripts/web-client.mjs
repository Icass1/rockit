import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const [target, command, ...args] = process.argv.slice(2);
if (
    !["responsive", "mobile", "desktop"].includes(target) ||
    !["dev", "build", "start"].includes(command)
) {
    throw new Error(
        "Usage: node scripts/web-client.mjs <responsive|mobile|desktop> <dev|build|start> [Next options]"
    );
}
const web = fileURLToPath(new URL("../apps/web/", import.meta.url));
const next = fileURLToPath(
    new URL("../apps/web/node_modules/next/dist/bin/next", import.meta.url)
);
const child = spawn(process.execPath, [next, command, ...args], {
    cwd: web,
    env: { ...process.env, ROCKIT_WEB_TARGET: target },
    stdio: "inherit",
});
for (const signal of ["SIGINT", "SIGTERM"])
    process.on(signal, () => child.kill(signal));
child.on("error", (error) => {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
});
child.on("exit", (code, signal) => {
    process.exitCode = code ?? (signal ? 1 : 0);
});
