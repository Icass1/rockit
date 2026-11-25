import {
    streakFlameFrame,
    streakFlamePalette,
} from "@rockit/ui/headless/streakArtwork";
import { expect, it } from "vitest";

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
    for (const days of [0, 1, 3, 7, 14, 30]) {
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
