import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const target = path.join(root, "apps/mobile/assets/medals/viewer.html");
const result = await build({
    entryPoints: [path.join(root, "packages/ui/src/browser/medalEmbed.web.ts")],
    bundle: true,
    minify: true,
    write: false,
    format: "iife",
    platform: "browser",
    target: "es2022",
    legalComments: "none",
    alias: { "@rockit/ui": path.join(root, "packages/ui/src") },
});
const script = result.outputFiles[0].text.replaceAll("</script", "<\\/script");
const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data:; connect-src 'none'; base-uri 'none'; form-action 'none'"><style>html,body{margin:0;width:100%;height:100%;overflow:hidden;overscroll-behavior:none}#medal-stage{width:100%;height:100%;touch-action:none;overscroll-behavior:contain;user-select:none}canvas{display:block}</style></head><body><div id="medal-stage"></div><script>${script}</script></body></html>\n`;
if (process.argv.includes("--check")) {
    const current = await readFile(target, "utf8").catch(() => "");
    if (current !== html)
        throw new Error(
            "The native medal asset is stale. Run node scripts/build-medal-embed.mjs"
        );
} else {
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, html);
}
console.log(
    `Native medal viewer: ${Buffer.byteLength(html)} bytes, generated from the shared renderer.`
);
