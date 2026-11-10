import {
    formatListeningDuration,
    formatStatsRange,
    statsDateBoundary,
    validateUsername,
} from "@rockit/shared";
import { expect, it } from "vitest";
import vocabulary from "../../../packages/shared/src/i18n/en.json";

it("uses full local day boundaries without mutating the selected date", () => {
    const chosen = new Date(2026, 10, 7, 12, 13, 14);
    const start = new Date(statsDateBoundary(chosen, "start")),
        end = new Date(statsDateBoundary(chosen, "end"));
    expect(start.getHours()).toBe(0);
    expect(start.getMinutes()).toBe(0);
    expect(end.getHours()).toBe(23);
    expect(end.getMinutes()).toBe(59);
    expect(end.getMilliseconds()).toBe(999);
    expect(chosen.getHours()).toBe(12);
});
it("formats ranges and listening units in the active vocabulary language", () => {
    expect(formatStatsRange("all", vocabulary, "en")).toBe(
        vocabulary.STATS_RANGE_ALL
    );
    expect(
        formatStatsRange(
            "custom",
            vocabulary,
            "es",
            new Date(2026, 10, 7),
            new Date(2026, 10, 8)
        )
    ).toContain("7/11/2026");
    expect(formatListeningDuration(1500, "fr")).toContain("1j");
    expect(formatListeningDuration(1500, "en")).toContain("1d");
    expect(validateUsername("á")).toBe("MOBILE_USERNAME_LENGTH");
    expect(validateUsername("fixture-user")).toBeNull();
});
