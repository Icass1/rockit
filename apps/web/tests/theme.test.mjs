import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const web = new URL("../", import.meta.url).pathname;
function sourceFiles(directory) {
    return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
        const path = join(directory, entry.name);
        return entry.isDirectory()
            ? sourceFiles(path)
            : /\.(?:tsx?|css)$/.test(path)
              ? [path]
              : [];
    });
}

test("application and component utilities use semantic theme roles instead of palette names", () => {
    const palette =
        /(?<![\w-])(?:bg|text|border(?:-[trblxy])?|ring(?:-offset)?|outline|fill|stroke|from|via|to|shadow|decoration|accent|caret|divide|placeholder)-(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)(?:-\d+)?(?![\w-])/g;
    const violations = ["app", "components"].flatMap((directory) =>
        sourceFiles(join(web, directory)).flatMap((path) =>
            [...readFileSync(path, "utf8").matchAll(palette)].map(
                (match) => `${path.slice(web.length)}: ${match[0]}`
            )
        )
    );
    assert.deepEqual(violations, []);
});
