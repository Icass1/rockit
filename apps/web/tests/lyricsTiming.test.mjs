import assert from "node:assert/strict";
import test from "node:test";
import {
    lyricPlaybackTime,
    lyricSeekTime,
} from "../../../packages/shared/src/utils/lyricsTiming.ts";
import { lyricsCorrectionSchema } from "../models/schemas/lyricsCorrection.ts";

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
