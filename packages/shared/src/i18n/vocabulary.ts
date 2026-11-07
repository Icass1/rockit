import type { VocabularyResponse } from "../dto/vocabularyResponse";
import type { Vocabulary } from "../models/types/vocabulary";
import english from "./en.json";

export const fallbackVocabulary: VocabularyResponse = {
    vocabulary: english,
    currentLang: "en",
};

/** Missing translations and internal-key placeholders fall back to the workbook. */
export function completeVocabulary(
    data: VocabularyResponse
): VocabularyResponse {
    return {
        currentLang: data.currentLang,
        vocabulary: {
            ...english,
            ...Object.fromEntries(
                Object.entries(data.vocabulary).filter(
                    ([key, value]) => value.trim() && value.trim() !== key
                )
            ),
        },
    };
}

export function vocabularyText(data: VocabularyResponse): Vocabulary {
    return completeVocabulary(data).vocabulary as unknown as Vocabulary;
}

export function preferredLanguage(value: string | null | undefined): string {
    const preferences = (value ?? "en").split(",").map((entry, index) => {
        const [locale, ...parameters] = entry.trim().split(";");
        const quality = parameters.find((part) => part.trim().startsWith("q="));
        const weight = quality ? Number(quality.trim().slice(2)) : 1;
        return { locale: locale.toLowerCase().split(/[-_]/)[0], weight, index };
    });
    return (
        preferences
            .filter(
                ({ locale, weight }) =>
                    ["en", "es", "fr"].includes(locale) &&
                    Number.isFinite(weight) &&
                    weight > 0 &&
                    weight <= 1
            )
            .sort((a, b) => b.weight - a.weight || a.index - b.index)[0]
            ?.locale ?? "en"
    );
}
