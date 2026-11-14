import { getTheme } from "@rockit/theme";
import { emblemArtwork } from "@rockit/ui/headless/emblemArtwork";
import { medalAwardDate, romanTier } from "@rockit/ui/headless/medalDesign";
import { describe, expect, it } from "vitest";

describe("collectible artwork", () => {
    it("has six different silhouettes and portable palette values", () => {
        const colors = getTheme("dark");
        const faces = [
            "bronze",
            "silver",
            "gold",
            "platinum",
            "diamond",
            "legend",
        ].map((league) => emblemArtwork(colors, "orbit", true, "test", league));
        expect(
            new Set(faces.map((xml) => xml.match(/<path d="([^"]+)"/)?.[1]))
                .size
        ).toBe(6);
        for (const xml of faces) {
            expect(xml).not.toContain("undefined");
            expect(xml).not.toContain("var(");
        }
        expect(
            emblemArtwork(colors, "moon", false, "one", "diamond")
        ).toContain(colors["medal-muted-metal"]);
        expect(
            emblemArtwork(colors, "<script>", true, "one", "unknown")
        ).not.toContain("<script>");
    });
});

it("uses Roman engraving ranks while keeping invalid ranks blank", () => {
    expect([1, 4, 9, 40, 99, 100].map(romanTier)).toEqual([
        "I",
        "IV",
        "IX",
        "XL",
        "XCIX",
        "C",
    ]);
    expect(romanTier(-1)).toBe("");
    expect(romanTier(2.5)).toBe("");
});

it("engraves only the award date, leaving invalid or locked dates blank", () => {
    expect(medalAwardDate("2026-11-13T17:00:00Z")).toBe("2026-11-13");
    expect(medalAwardDate(null)).toBe("");
    expect(medalAwardDate("invalid")).toBe("");
});

it("uses the actual family for legacy awards and safely resolves unknown variants", async () => {
    const { emblemFamilyVariant } =
        await import("@rockit/ui/headless/emblemFamilies");
    expect(emblemFamilyVariant("orbit", "session")).toBe("ignition");
    expect(emblemFamilyVariant("atlas", "total")).toBe("orbit");
    expect(emblemFamilyVariant("voyager", "total")).toBe("orbit");
    expect(emblemFamilyVariant("longplay")).toBe("flame");
    expect(emblemFamilyVariant("<script>", "__proto__")).toBe("ignition");
});
it("makes all sixteen filled family marks visible on every league's static artwork", async () => {
    const { emblemFamilyMarks } =
        await import("@rockit/ui/headless/emblemFamilies");
    const { medalLeagues } = await import("@rockit/ui/headless/medalShapes");
    expect(Object.keys(emblemFamilyMarks)).toHaveLength(16);
    expect(new Set(Object.values(emblemFamilyMarks)).size).toBe(16);
    for (const [variant, path] of Object.entries(emblemFamilyMarks))
        for (const league of medalLeagues)
            expect(
                emblemArtwork(getTheme("dark"), variant, true, "mark", league)
            ).toContain(`d="${path}"`);
    expect(
        emblemArtwork(
            getTheme("dark"),
            "orbit",
            true,
            "scope",
            "legend",
            "session"
        )
    ).toContain(`d="${emblemFamilyMarks.ignition}"`);
});
