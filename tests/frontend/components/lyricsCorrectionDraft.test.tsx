// @vitest-environment jsdom
import type { LyricsCorrectionContextResponse } from "@rockit/shared";
import { useLyricsCorrectionDraft } from "@rockit/ui/headless/useLyricsCorrectionDraft";
import { act, renderHook } from "@testing-library/react";
import { expect, it } from "vitest";

it("sends edited words and timings without mutating the provider snapshot", () => {
    const snapshot: LyricsCorrectionContextResponse = {
        provider: "LRCLIB",
        publicId: "lyrics",
        revision: "a".repeat(64),
        syncStatus: "provider",
        offset: 0,
        lines: [
            {
                text: "Helo world",
                timestamp_s: 2,
                end_timestamp_s: 5,
                words: [
                    { text: "Helo ", timestamp_s: 2, end_timestamp_s: 3 },
                    { text: "world", timestamp_s: 3, end_timestamp_s: 5 },
                ],
            },
        ],
    };
    const { result } = renderHook(() => useLyricsCorrectionDraft(snapshot));
    expect(result.current.changed).toBe(false);

    act(() => result.current.editWord(0, 0, { text: "Hello " }));
    act(() => result.current.editWord(0, 1, { timestamp_s: 3.1 }));
    expect(result.current.changed).toBe(true);
    expect(result.current.proposal.success).toBe(true);
    expect(result.current.proposal.data?.lines[0]).toEqual({
        ...snapshot.lines[0],
        text: "Hello world",
        words: [
            { text: "Hello ", timestamp_s: 2, end_timestamp_s: 3 },
            { text: "world", timestamp_s: 3.1, end_timestamp_s: 5 },
        ],
    });
    expect(snapshot.lines[0].text).toBe("Helo world");

    act(() => result.current.editWord(0, 1, { end_timestamp_s: 2 }));
    expect(result.current.proposal.success).toBe(false);
});
