"use client";

import { useStore } from "@nanostores/react";
import { rockIt } from "@/lib/rockit/rockIt";

export function usePiPText(): (
    key: string,
    english: string,
    spanish: string
) => string {
    const vocabulary = useStore(rockIt.vocabularyManager.vocabularyAtom);
    const lang = useStore(rockIt.vocabularyManager.langAtom);
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
