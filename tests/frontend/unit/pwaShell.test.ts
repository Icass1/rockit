import { execFileSync } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { designTokens } from "@rockit/theme";
import { expect, it } from "vitest";

it("prepares an edge-to-edge installable shell with a single viewport and the full-size icon", async () => {
    const directory = await mkdtemp(path.join(os.tmpdir(), "rockit-pwa-"));
    try {
        await writeFile(
            path.join(directory, "index.html"),
            '<html><head><meta name="viewport" content="width=device-width"></head><body><div id="root"></div></body></html>'
        );
        execFileSync(process.execPath, [
            "scripts/prepare-mobile-pwa.mjs",
            directory,
        ]);
        execFileSync(process.execPath, [
            "scripts/prepare-mobile-pwa.mjs",
            directory,
        ]);
        const html = await readFile(path.join(directory, "index.html"), "utf8");
        const manifest = JSON.parse(
            await readFile(path.join(directory, "manifest.webmanifest"), "utf8")
        );
        expect(html.match(/name="viewport"/g)).toHaveLength(1);
        expect(html).toContain("viewport-fit=cover");
        expect(html).toContain(designTokens.themes.dark.background);
        expect(manifest.orientation).toBe("portrait");
        expect(manifest.icons[0].sizes).toBe("512x512");
        expect(await readFile(path.join(directory, "icon.png"))).toEqual(
            await readFile("apps/mobile/assets/images/logo-512.png")
        );
    } finally {
        await rm(directory, { recursive: true, force: true });
    }
});
