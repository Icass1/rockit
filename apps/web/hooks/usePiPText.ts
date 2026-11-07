"use client";

import {
    useLanguage,
    useVocabulary,
} from "@/components/providers/VocabularyProvider";

export function usePiPText(): (
    key: string,
    english: string,
    spanish: string
) => string {
    const vocabulary = useVocabulary();
    const lang = useLanguage();
    return (key, english, spanish): string => {
        const translated = (vocabulary as unknown as Record<string, string>)[
            key
        ];
        return translated && translated !== key
            ? translated
            : lang.startsWith("es")
              ? spanish
              : english;
    };
}
