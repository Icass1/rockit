import {
    annualRecapRange,
    buildAnnualRecap,
    loadAnnualRecap,
} from "@rockit/shared";
import { describe, expect, it, vi } from "vitest";
import { recapStats } from "../fixtures/annualRecap";

const now = new Date("2026-11-13T12:00:00Z");

describe("annual recap", () => {
    it("uses a calendar year and a real current cutoff, including leap years", () => {
        expect(annualRecapRange(2026, now)).toEqual({
            year: 2026,
            start: "2026-01-01T00:00:00.000Z",
            end: now.toISOString(),
            inProgress: true,
        });
        const leap = annualRecapRange(2024, now);
        expect(Date.parse(leap.end) - Date.parse(leap.start)).toBe(
            366 * 86400000
        );
        expect(leap.inProgress).toBe(false);
        expect(() => annualRecapRange(2027, now)).toThrow();
    });
    it("builds a factual five-to-one countdown and never pads missing artists", () => {
        const result = buildAnnualRecap(recapStats, 2026, now);
        expect(
            result.slides
                .filter((slide) => slide.kind === "artists")
                .map((slide) => [slide.rank, slide.item?.name])
        ).toEqual([
            [5, "Twenty One Pilots"],
            [4, "Tame Impala"],
            [3, "Fleetwood Mac"],
            [2, "M83"],
            [1, "Radiohead"],
        ]);
        expect(result.slides.find((slide) => slide.id === "time")?.value).toBe(
            24840
        );
        expect(
            result.slides.find((slide) => slide.id === "insight")?.titleKey
        ).toBe("RECAP_STREAK_TITLE");
        expect(result.slides.find((slide) => slide.id === "month")?.month).toBe(
            3
        );
        const sparse = buildAnnualRecap(
            {
                ...recapStats,
                topArtists: recapStats.topArtists.slice(0, 1),
                topSongs: [],
            },
            2026,
            now
        );
        expect(
            sparse.slides
                .filter((slide) => slide.kind === "artists")
                .map((slide) => slide.rank)
        ).toEqual([1]);
        expect(sparse.slides.some((slide) => slide.kind === "song")).toBe(
            false
        );
    });
    it("uses conservative narrative thresholds and avoids partial-month conclusions", () => {
        const stats = {
            ...recapStats,
            insights: { ...recapStats.insights, longestStreak: 13 },
            minutes: [
                { ...recapStats.minutes[0], end: "2026-04-08T00:00:00Z" },
            ],
        };
        expect(
            buildAnnualRecap(stats, 2026, now).slides.find(
                (slide) => slide.id === "insight"
            )?.titleKey
        ).toBe("RECAP_DISCOVERY_TITLE");
        expect(
            buildAnnualRecap(stats, 2026, now).slides.some(
                (slide) => slide.id === "month"
            )
        ).toBe(false);
        expect(
            buildAnnualRecap(
                {
                    ...stats,
                    insights: { ...stats.insights, discoveryCount: 19 },
                },
                2026,
                now
            ).slides.find((slide) => slide.id === "insight")?.titleKey
        ).toBe("RECAP_RHYTHM_TITLE");
        expect(
            buildAnnualRecap(
                { ...stats, summary: { ...stats.summary, totalPlayTimeMs: 0 } },
                2026,
                now
            ).slides
        ).toEqual([]);
    });
    it("uses the validated platform boundary once and propagates failures", async () => {
        const getUserStatsV2 = vi
            .fn()
            .mockResolvedValue({ isOk: () => true, result: recapStats });
        expect(
            (await loadAnnualRecap({ getUserStatsV2 }, 2026, now)).year
        ).toBe(2026);
        expect(getUserStatsV2).toHaveBeenCalledExactlyOnceWith({
            range: "custom",
            start: "2026-01-01T00:00:00.000Z",
            end: now.toISOString(),
            timezoneOffsetMinutes: 0,
        });
        getUserStatsV2.mockResolvedValue({
            isOk: () => false,
            detail: "unavailable",
        });
        await expect(
            loadAnnualRecap({ getUserStatsV2 }, 2026, now)
        ).rejects.toThrow("unavailable");
    });
});
