"use client";

import {
    createContext,
    useContext,
    useEffect,
    useMemo,
    useState,
    type JSX,
    type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import type { VocabularyResponse } from "@/dto";
import type { Vocabulary } from "@rockit/shared/models/types/vocabulary";
import { completeVocabulary, fallbackVocabulary } from "@/lib/i18n/vocabulary";
import { rockIt } from "@/lib/rockit/rockIt";

const VocabularyContext = createContext<VocabularyResponse>(fallbackVocabulary);

/** Server props are the render input; effects only bridge legacy runtime notifications. */
export function VocabularyProvider({
    initial,
    children,
}: {
    initial: VocabularyResponse;
    children: ReactNode;
}): JSX.Element {
    const router = useRouter();
    const [replacement, setReplacement] = useState<{
        source: VocabularyResponse;
        data: VocabularyResponse;
    }>();
    const current =
        replacement?.source === initial ? replacement.data : initial;
    const snapshot = useMemo(() => completeVocabulary(current), [current]);
    useEffect(() => {
        rockIt.vocabularyManager.setVocabulary(initial);
        const unsubscribe = rockIt.vocabularyManager.responseAtom.listen(
            (data) => {
                setReplacement({ source: initial, data });
            }
        );
        const languageChanged = (): void => {
            document.cookie = `rockit-language=${encodeURIComponent(rockIt.vocabularyManager.lang)}; Path=/; SameSite=Lax`;
            router.refresh();
        };
        window.addEventListener("rockit:language-changed", languageChanged);
        return (): void => {
            unsubscribe();
            window.removeEventListener(
                "rockit:language-changed",
                languageChanged
            );
        };
    }, [initial, router]);
    useEffect(() => {
        document.documentElement.lang = snapshot.currentLang;
    }, [snapshot.currentLang]);
    return <VocabularyContext value={snapshot}>{children}</VocabularyContext>;
}

export function useVocabulary(): Vocabulary {
    return useContext(VocabularyContext).vocabulary as unknown as Vocabulary;
}

export function useLanguage(): string {
    return useContext(VocabularyContext).currentLang;
}
