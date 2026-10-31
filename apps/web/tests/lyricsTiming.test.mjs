import assert from "node:assert/strict";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

const result = await build({
    absWorkingDir: fileURLToPath(new URL("..", import.meta.url)),
    stdin: {
        contents: `export { lyricPlaybackTime, lyricSeekTime } from "@rockit/shared/utils/lyricsTiming";
            export { lyricsCorrectionSchema } from "@/models/schemas/lyricsCorrection";`,
        resolveDir: fileURLToPath(new URL("..", import.meta.url)),
    },
    bundle: true,
    platform: "node",
    format: "esm",
    write: false,
});
const { lyricPlaybackTime, lyricSeekTime, lyricsCorrectionSchema } = await import(
    `data:text/javascript;base64,${Buffer.from(result.outputFiles[0].text).toString("base64")}`
);

test("delay and advance use the same original clock for highlighting and seeking", () => {
    assert.equal(lyricPlaybackTime(10, -1), 11);
    assert.equal(lyricSeekTime(10, -1), 11);
    assert.equal(lyricPlaybackTime(10, 1), 9);
    assert.equal(lyricSeekTime(10, 1), 9);
    assert.equal(lyricSeekTime(0, 1), 0);
    assert.equal(lyricPlaybackTime(0, 1), -1);
});

test("invalid partial, reversed or non-finite timing cannot be submitted", () => {
    const base = {
        kind: "lyrics_correction",
        provider: "LRCLIB",
        revision: "a".repeat(64),
        offset: 0,
    };
    for (const lines of [
        [
            { text: "First", timestamp_s: 2 },
            { text: "Second", timestamp_s: 1 },
        ],
        [
            { text: "First", timestamp_s: 1 },
            { text: "Second", timestamp_s: null },
        ],
        [{ text: "Invalid", timestamp_s: NaN }],
    ])
        assert.equal(
            lyricsCorrectionSchema.safeParse({ ...base, lines }).success,
            false
        );
    assert.equal(
        lyricsCorrectionSchema.safeParse({
            ...base,
            lines: [{ text: "Plain", timestamp_s: null }],
        }).success,
        true
    );
});
