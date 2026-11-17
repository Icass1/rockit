import { expect, it } from "vitest";
import { parseLyricsSourceId } from "../../../packages/shared/src/utils/lyricsSource";

it("accepts trimmed LRCLIB IDs and rejects URLs, fractions and unsafe numbers", () => {
    expect(parseLyricsSourceId(" 123456 ")).toBe(123456);
    for (const input of [
        "",
        "0",
        "-1",
        "1.5",
        "1e3",
        "0x12",
        "https://lrclib.net/api/get/123",
        "9007199254740992",
    ])
        expect(parseLyricsSourceId(input)).toBeUndefined();
});
