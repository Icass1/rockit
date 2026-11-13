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
