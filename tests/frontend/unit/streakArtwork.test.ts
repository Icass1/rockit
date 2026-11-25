import {
    streakFlameFrame,
    streakFlamePalette,
    streakFlameStage,
} from "@rockit/ui/headless/streakArtwork";
import { expect, it } from "vitest";

it("has fifteen distinct two-day stages and keeps the final frame and color after one month", () => {
    const frames = new Set<string>();
    for (let stage = 0; stage < 15; stage++) {
        const firstDay = stage * 2 + 1;
        const frame = streakFlameFrame(firstDay, 640);
        expect(streakFlameStage(firstDay)).toBe(stage);
        expect(streakFlameStage(firstDay + 1)).toBe(stage);
        expect(streakFlameFrame(firstDay + 1, 640)).toEqual(frame);
        expect(streakFlamePalette(firstDay + 1)).toEqual(
            streakFlamePalette(firstDay)
        );
        frames.add(frame.outer);
    }
    expect(frames.size).toBe(15);
    for (const day of [31, 60, 365]) {
        expect(streakFlameFrame(day, 1370)).toEqual(streakFlameFrame(30, 1370));
        expect(streakFlamePalette(day)).toEqual(streakFlamePalette(30));
    }
});

it("keeps the fire grounded while higher streaks grow and shed attached tongues", () => {
    const seed = streakFlameFrame(1, 200);
    const blaze = streakFlameFrame(14, 200);
    expect(seed.outer).toMatch(/^M50 85/);
    expect(blaze.outer).toMatch(/^M50 85/);
    expect(seed.outer.match(/M/g)).toHaveLength(1);
    expect(blaze.outer.match(/M/g)!.length).toBeGreaterThan(1);
    expect(streakFlameFrame(14, 0).sparks).toBe("");
    expect(
        Array.from({ length: 24 }, (_, index) =>
            streakFlameFrame(14, index * 125)
        ).some((frame) => frame.sparks)
    ).toBe(true);
});

it("uses a warmer palette and finite animated paths through all stages", () => {
    expect(streakFlamePalette(3).body).not.toEqual(streakFlamePalette(14).body);
    for (let days = 1; days <= 29; days += 2) {
        const first = streakFlameFrame(days, 0);
        expect(streakFlameFrame(days, 221).outer).not.toBe(first.outer);
        for (let time = 0; time <= 12_000; time += 137) {
            const frame = streakFlameFrame(days, time);
            expect(
                `${frame.outer}${frame.inner}${frame.core}${frame.highlight}${frame.sparks}`
            ).not.toMatch(/NaN|Infinity/);
        }
    }
});
