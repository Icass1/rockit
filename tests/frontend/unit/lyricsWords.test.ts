import { LyricsCorrectionContextResponseSchema } from "@/dto";
import {
    lyricLineFillEnd,
    lyricSeekTime,
    lyricWordFill,
    lyricWordState,
} from "@/utils/lyricsTiming";
import { expect, it } from "vitest";

it("uses word boundaries, explicit gaps, missing ends, offsets and backward seeks", () => {
    const first = { text: "Hello ", timestamp_s: 10, end_timestamp_s: 11 };
    const second = { text: "world", timestamp_s: 12, end_timestamp_s: null };
    expect(lyricWordState(first, null)).toBe("future");
    expect(lyricWordState(first, Number.NaN)).toBe("future");
    expect(lyricWordState(first, 7, 2)).toBe("future");
    expect(lyricWordState(first, 8, 2)).toBe("active");
    expect(lyricWordState(first, 9, 2, 12)).toBe("past");
    expect(lyricWordState(second, 9, 2, 14)).toBe("future");
    expect(lyricWordState(second, 10, 2, 14)).toBe("active");
    expect(lyricWordState(second, 12, 2, 14)).toBe("past");
    expect(lyricWordState(second, 7, 2, 14)).toBe("future");
    expect(lyricSeekTime(second.timestamp_s, 2)).toBe(10);
});

it("fills only within the current word, including with offsets and fallback ends", () => {
    const word = { text: "Hello ", timestamp_s: 10, end_timestamp_s: 11 };
    expect(lyricWordFill(word, 7, 2)).toBe("future");
    expect(lyricWordFill(word, 8, 2)).toBe(0);
    expect(lyricWordFill(word, 8.5, 2)).toBe(0.5);
    expect(lyricWordFill(word, 9, 2)).toBe("past");
    const withoutEnd = { ...word, end_timestamp_s: null };
    expect(lyricWordFill(withoutEnd, 9, 2, 12)).toBe(0.5);
    expect(lyricWordFill(withoutEnd, 9, 2)).toBe(1);
    expect(lyricWordFill(withoutEnd, 8, 2, 10)).toBe("past");
});

it("completes the previous word when the next begins despite overlapping timestamps", () => {
    const previous = { text: "Hola ", timestamp_s: 10, end_timestamp_s: 13 };
    const next = { text: "mundo", timestamp_s: 12, end_timestamp_s: 14 };
    expect(lyricWordFill(previous, 9, 2, next.timestamp_s)).toBe(0.5);
    expect(lyricWordFill(previous, 10, 2, next.timestamp_s)).toBe("past");
    expect(lyricWordFill(next, 10, 2)).toBe(0);
    expect(lyricWordFill(previous, 10.5, 2, next.timestamp_s)).toBe("past");
});

it("honors a measured pause and bounds an unfinished line by the next entry", () => {
    const word = { text: "Vuelvo", timestamp_s: 1, end_timestamp_s: null };
    expect(lyricWordFill(word, 2.4, 0, lyricLineFillEnd(2, 2.5))).toBe("past");
    expect(lyricWordFill(word, 2, 0, lyricLineFillEnd(null, 3))).toBe(0.5);
    expect(lyricWordFill(word, 2, 0, lyricLineFillEnd(4, 3))).toBe(0.5);
    expect(lyricWordFill(word, 3, 0, lyricLineFillEnd(4, 3))).toBe("past");
});

it("validates and retains word timings at the shared HTTP boundary", () => {
    const data = LyricsCorrectionContextResponseSchema.parse({
        provider: "LRCLIB",
        publicId: "lyrics",
        revision: null,
        offset: 0,
        syncStatus: "provider",
        lines: [
            {
                text: "你好",
                timestamp_s: 1.234,
                end_timestamp_s: 3,
                words: [
                    { text: "你", timestamp_s: 1.234, end_timestamp_s: 2 },
                    { text: "好", timestamp_s: 2, end_timestamp_s: null },
                ],
            },
        ],
    });
    expect(data.lines[0].words.map((word) => word.text).join("")).toBe("你好");
    expect(data.lines[0].words[0].timestamp_s).toBe(1.234);
});
