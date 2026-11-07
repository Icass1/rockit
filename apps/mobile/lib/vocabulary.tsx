import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useRef,
    type ReactNode,
} from "react";
import { vocabularyText, type Vocabulary } from "@rockit/shared";
import { useAsyncResource } from "@rockit/ui/headless/useAsyncResource";
import { Http } from "@/lib/http";
import { vocabularyManager } from "@/lib/managers/vocabularyManager";
import { toasterManager } from "@/lib/toasterManager";

interface VocabularyContextType {
    vocabulary: Vocabulary;
    lang: string;
    isLoading: boolean;
    refreshVocabulary: () => Promise<void>;
    setLanguage: (lang: string) => Promise<void>;
}
const VocabularyContext = createContext<VocabularyContextType | null>(null);

export function VocabularyProvider({ children }: { children: ReactNode }) {
    const locale = useRef(
        Intl.DateTimeFormat().resolvedOptions().locale.split(/[-_]/)[0]
    );
    const resource = useAsyncResource(async () => {
        const response = await Http.getUserVocabulary();
        if (response.isOk()) return response.result;
        const fallback = await Http.getVocabularyByCode(locale.current);
        if (!fallback.isOk()) throw new Error(fallback.message);
        return fallback.result;
    });
    const vocabulary = useMemo(
        () =>
            vocabularyText(
                resource.data ?? { currentLang: "en", vocabulary: {} }
            ),
        [resource.data]
    );
    useEffect(() => {
        vocabularyManager.setVocabulary({ ...vocabulary });
    }, [vocabulary]);
    const setLanguage = useCallback(
        async (lang: string) => {
            const response = await Http.updateLang({ lang });
            if (response.isOk()) {
                toasterManager.notifySuccess(vocabulary.LANGUAGE_CHANGED);
                await resource.refresh();
            } else
                toasterManager.notifyError(vocabulary.LANGUAGE_CHANGE_FAILED);
        },
        [vocabulary, resource.refresh]
    );
    return (
        <VocabularyContext
            value={{
                vocabulary,
                lang: resource.data?.currentLang ?? "en",
                isLoading: resource.loading,
                refreshVocabulary: resource.refresh,
                setLanguage,
            }}
        >
            {children}
        </VocabularyContext>
    );
}

export function useVocabulary() {
    const context = useContext(VocabularyContext);
    if (!context) throw new Error("VocabularyProvider is required");
    return context;
}
