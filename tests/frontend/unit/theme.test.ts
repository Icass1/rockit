import { completeVocabulary } from "@rockit/shared";
import {
    designTokens,
    getTheme,
    parseTheme,
    resolveTheme,
    withAlpha,
} from "@rockit/theme";
import { describe, expect, it } from "vitest";

describe("shared presentation contracts", () => {
    it("resolves saved/system themes and rejects invalid preferences", () => {
        expect(parseTheme("invalid")).toBe("dark");
        expect(resolveTheme("system", "light")).toBe("light");
        expect(resolveTheme("dark", "light")).toBe("dark");
        expect(getTheme("light").primary).toBe(
            designTokens.themes.light.primary
        );
        expect(getTheme("light")["provider-spotify"]).toBe(
            getTheme("dark")["provider-spotify"]
        );
    });

    it("applies bounded opacity without another component palette", () => {
        expect(withAlpha(getTheme("dark").primary, 2)).toMatch(/, 1\)$/);
        expect(withAlpha(getTheme("dark").primary, -1)).toMatch(/, 0\)$/);
        expect(withAlpha(getTheme("dark").primary, Number.NaN)).toBe(
            getTheme("dark").primary
        );
    });

    it("retains translations and Unicode while missing/internal-key values use the workbook fallback", () => {
        const value = completeVocabulary({
            currentLang: "es",
            vocabulary: {
                LIBRARY: "Biblioteca",
                SEARCH: "SEARCH",
                SONGS: " ",
                FOR_YOU: "Música para ti — Angèle",
            },
        });
        expect(value.vocabulary.LIBRARY).toBe("Biblioteca");
        expect(value.vocabulary.SEARCH).toBe("Search");
        expect(value.vocabulary.SONGS).toBe("Songs");
        expect(value.vocabulary.FOR_YOU).toContain("Angèle");
    });
});
