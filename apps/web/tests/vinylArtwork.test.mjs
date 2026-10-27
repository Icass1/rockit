/* eslint @typescript-eslint/explicit-function-return-type: "off" */
import assert from "node:assert/strict";
import test from "node:test";
import vm from "node:vm";
import { build } from "esbuild";

const { outputFiles } = await build({
    entryPoints: [
        new URL("../lib/managers/playerUIManager.ts", import.meta.url).pathname,
    ],
    bundle: true,
    write: false,
    format: "iife",
    globalName: "artwork",
    tsconfig: new URL("../tsconfig.json", import.meta.url).pathname,
});
const { shouldKeepVinyl } = vm.runInNewContext(
    `${outputFiles[0].text}; artwork;`,
    {
        process: { env: {} },
        console,
        setTimeout,
        clearTimeout,
    }
);
const song = (publicId, imageUrl, albumId) => ({
    type: "song",
    publicId,
    imageUrl,
    ...(albumId === undefined
        ? {}
        : { album: { publicId: albumId, name: "Album" } }),
});

for (const [label, a, b, keep] of [
    [
        "same album with different cover URLs",
        song("a", "a.jpg", "album"),
        song("b", "b.jpg", "album"),
        true,
    ],
    [
        "same cover across different albums",
        song("a", "cover.jpg", "one"),
        song("b", "cover.jpg", "two"),
        true,
    ],
    [
        "different albums and covers",
        song("a", "a.jpg", "one"),
        song("b", "b.jpg", "two"),
        false,
    ],
    ["missing covers and albums", song("a"), song("b"), false],
    [
        "empty identifiers are not an album match",
        song("a", "", ""),
        song("b", "", ""),
        false,
    ],
    [
        "same album title is not an album identity",
        song("a", "a.jpg", "one"),
        song("b", "b.jpg", "two"),
        false,
    ],
    [
        "metadata refresh of the same track",
        song("a", "a.jpg"),
        song("a", "blob:offline"),
        true,
    ],
]) {
    test(`vinyl: ${label}, forward and backward`, () => {
        assert.equal(shouldKeepVinyl(a, b), keep);
        assert.equal(shouldKeepVinyl(b, a), keep);
    });
}

test("successive shared album/cover matches compare each destination with its predecessor", () => {
    const a = song("a", "a.jpg", "one");
    const b = song("b", "b.jpg", "one");
    const c = song("c", "b.jpg", "two");
    const d = song("d", "d.jpg", "three");
    for (const [previous, next, keep] of [
        [a, b, true],
        [b, c, true],
        [c, d, false],
        [d, c, false],
        [c, b, true],
        [b, a, true],
    ]) {
        assert.equal(shouldKeepVinyl(previous, next), keep);
    }
});
