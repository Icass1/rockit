import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import ts from "typescript";

const root = path.resolve(import.meta.dirname, "..");
const failures = [];
async function files(directory) {
    const entries = await readdir(path.join(root, directory), {
        withFileTypes: true,
    });
    const groups = await Promise.all(
        entries
            .filter(
                (entry) =>
                    ![
                        "node_modules",
                        ".next",
                        ".expo",
                        "dist",
                        "android",
                        "ios",
                    ].includes(entry.name)
            )
            .map((entry) =>
                entry.isDirectory()
                    ? files(path.join(directory, entry.name))
                    : /\.(?:ts|tsx|css)$/.test(entry.name)
                      ? [path.join(directory, entry.name)]
                      : []
            )
    );
    return groups.flat();
}
const domains = [
    "packages/shared/src",
    "packages/ui/src",
    "packages/platform-browser/src",
    "apps/mobile/app",
    "apps/mobile/components",
    "apps/mobile/hooks",
    "apps/web/app",
    "apps/web/components",
    "apps/web/styles",
];
const color = /^(?:#[\da-f]{3,8}$|rgba?\(\s*\d|hsla?\(\s*\d)/i;
const dataLabels = new Set([
    "RockIt!",
    "RockIt",
    "RockIt! v",
    "MP4 · WEBM · MKV · AVI · MOV",
    "MB",
    "LRC",
    "LIB",
]);
for (const file of (await Promise.all(domains.map(files))).flat()) {
    const source = await readFile(path.join(root, file), "utf8");
    if (file.endsWith(".css")) continue;
    const ast = ts.createSourceFile(
        file,
        source,
        ts.ScriptTarget.Latest,
        true,
        file.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS
    );
    const shared = file.startsWith("packages/shared/");
    const commonUi =
        file.startsWith("packages/ui/") && !/\.(web|native)\./.test(file);
    const browser = file.startsWith("packages/platform-browser/");
    const ui =
        file.startsWith("apps/") && /\/(app|components|hooks)\//.test(file);
    const localNames = new Set();
    const locate = (node) =>
        ast.getLineAndCharacterOfPosition(node.getStart(ast)).line + 1;
    const fail = (node, message) =>
        failures.push(`${file}:${locate(node)}: ${message}`);
    function names(node) {
        if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name))
            localNames.add(node.name.text);
        ts.forEachChild(node, names);
    }
    names(ast);
    function visit(node) {
        if (
            ts.isImportDeclaration(node) &&
            ts.isStringLiteral(node.moduleSpecifier)
        ) {
            const name = node.moduleSpecifier.text;
            if (
                (shared || commonUi) &&
                (/^(?:next(?:\/|$)|expo(?:-|\/|$)|react-native(?:-|\/|$))/.test(
                    name
                ) ||
                    name.includes("apps/"))
            )
                fail(node, `Platform import in portable source: ${name}`);
            if (
                browser &&
                (/^(?:next(?:\/|$))/.test(name) || name.includes("apps/"))
            )
                fail(node, `Host import in browser adapter: ${name}`);
        }
        if (
            (shared || commonUi) &&
            ts.isIdentifier(node) &&
            [
                "window",
                "document",
                "navigator",
                "localStorage",
                "indexedDB",
            ].includes(node.text) &&
            !localNames.has(node.text)
        ) {
            if (
                (ts.isPropertyAccessExpression(node.parent) &&
                    node.parent.expression === node) ||
                ts.isTypeOfExpression(node.parent)
            )
                fail(node, `Browser global in portable source: ${node.text}`);
        }
        if (ui && ts.isStringLiteral(node) && color.test(node.text))
            fail(node, "Palette literal must come from @rockit/theme");
        if (ui) {
            let visible;
            if (ts.isJsxText(node)) visible = node.text.trim();
            else if (
                ts.isStringLiteral(node) &&
                ts.isJsxAttribute(node.parent) &&
                [
                    "label",
                    "title",
                    "placeholder",
                    "alt",
                    "accessibilityLabel",
                    "aria-label",
                ].includes(node.parent.name.getText(ast))
            )
                visible = node.text;
            if (visible) {
                visible = visible
                    .replace(/&(?:[a-z]+|#\d+);/gi, "")
                    .replace(/\s+/g, " ")
                    .trim();
                if (/[A-Za-zÀ-ÿ]{2}/.test(visible) && !dataLabels.has(visible))
                    fail(
                        node,
                        `Inline UI text must use Vocabulary.xlsx: ${visible}`
                    );
            }
        }
        ts.forEachChild(node, visit);
    }
    visit(ast);
}
const shell = await readFile(
    path.join(root, "apps/web/components/Layout/AppClientLayout.tsx"),
    "utf8"
);
if (/MobilePlayer|MobileBottomNav|@\/components\/Mobile\//.test(shell))
    failures.push("Desktop shell imports the retired mobile presentation");
if (failures.length) throw new Error(failures.join("\n"));
process.stdout.write(
    "Portable import boundaries, shared palettes and inline JSX vocabulary: passed.\n"
);
