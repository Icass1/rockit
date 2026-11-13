import { getTheme } from "@rockit/theme";
import { emblemArtwork } from "@rockit/ui/headless/emblemArtwork";
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
