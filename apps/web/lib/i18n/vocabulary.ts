import type { VocabularyResponse } from "@/dto";
import english from "@rockit/shared/i18n/en.json";
import type { Vocabulary } from "@rockit/shared/models/types/vocabulary";

export const fallbackVocabulary: VocabularyResponse = {
    vocabulary: english,
    currentLang: "en",
};

/** Empty translations fall back to the workbook, never to internal keys. */
export function completeVocabulary(
    data: VocabularyResponse
): VocabularyResponse {
    return {
        currentLang: data.currentLang,
        vocabulary: {
            ...english,
            ...Object.fromEntries(
                Object.entries(data.vocabulary).filter(([, value]) =>
                    value.trim()
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
