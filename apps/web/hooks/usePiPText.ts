"use client";

import type { Vocabulary } from "@/models/types/vocabulary";
import { useVocabulary } from "@/components/providers/VocabularyProvider";

export function usePiPText(): (key: keyof Vocabulary) => string {
    const vocabulary = useVocabulary();
    return (key) => vocabulary[key];
}
