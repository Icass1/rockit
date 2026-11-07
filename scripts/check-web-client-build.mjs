import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";

const [target] = process.argv.slice(2);
if (!["mobile", "desktop"].includes(target))
    throw new Error("Specify mobile or desktop");
const directory = resolve(`apps/web/.next-${target}/static/chunks`);
const files = (await readdir(directory)).filter((file) =>
    file.endsWith(".js.map")
);
if (!files.length)
    throw new Error(
        "Build with ROCKIT_ANALYZE_CLIENT=1 first; no client source maps found"
    );
const sources = new Set();
for (const file of files) {
    for (const source of JSON.parse(
        await readFile(resolve(directory, file), "utf8")
    ).sources ?? [])
        sources.add(source);
}
const has = (path) => [...sources].some((source) => source.includes(path));
const expected = target === "mobile" ? "MobileChrome" : "DesktopChrome";
const excluded = target === "mobile" ? "DesktopChrome" : "MobileChrome";
assert.ok(has(`Layout/shells/${expected}.tsx`), `Missing ${expected}`);
assert.ok(
    !has(`Layout/shells/${excluded}.tsx`),
    `Unexpected ${excluded} in ${target} output`
);
assert.ok(
    !has("Layout/ClientShell.tsx"),
    "Responsive selector leaked into dedicated build"
);
if (target === "mobile") {
    for (const path of [
        "Footer/Footer.tsx",
        "Header/Header.tsx",
        "Navigation/Navigation.tsx",
        "PlayerUI/PlayerUI.tsx",
        "KeyboardHandler/KeyboardHandler.tsx",
    ]) {
        assert.ok(!has(path), `Desktop entry leaked: ${path}`);
    }
} else assert.ok(!has("MobilePlayer/MobilePlayer.tsx"));
process.stdout.write(
    JSON.stringify({
        target,
        sourceFiles: sources.size,
        expected,
        excluded,
        result: "isolated",
    }) + "\n"
);
