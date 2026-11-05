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

test("interface color literals stay in the central theme instead of components and feature styles", () => {
    const literal = /#[\da-f]{3,8}\b|\brgba?\(\s*\d|\bhsla?\(\s*\d/gi;
    const paths = ["components", "styles"]
        .flatMap((directory) => sourceFiles(join(web, directory)))
        .filter((path) => !path.includes("/styles/tokens/"));
    const violations = paths.flatMap((path) =>
        [...readFileSync(path, "utf8").matchAll(literal)].map(
            (match) => `${path.slice(web.length)}: ${match[0]}`
        )
    );
    assert.deepEqual(violations, []);
});

test("every referenced interface palette variable is defined by the central theme", () => {
    const theme = readFileSync(join(web, "styles/tokens/theme.css"), "utf8");
    const defined = new Set(
        [...theme.matchAll(/--theme-([\w-]+)\s*:/g)].map((match) => match[1])
    );
    const missing = ["components", "styles", "lib"]
        .flatMap((directory) => sourceFiles(join(web, directory)))
        .flatMap((path) =>
            [...readFileSync(path, "utf8").matchAll(/var\(--theme-([\w-]+)/g)]
                .filter((match) => !defined.has(match[1]))
                .map((match) => `${path.slice(web.length)}: ${match[1]}`)
        );
    assert.deepEqual(missing, []);
});
