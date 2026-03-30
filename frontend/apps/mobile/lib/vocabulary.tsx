import React, {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useState,
    type ReactNode,
} from "react";
import {
    UpdateLangRequestSchema,
    UserVocabularyResponseSchema,
    type Vocabulary,
} from "@rockit/shared";
import { apiGet, apiPatchNoResponse } from "./api";

function createVocabularyProxy(data: Record<string, string>): Vocabulary {
    return new Proxy(data, {
        get(target, prop: string) {
            return target[prop] ?? prop;
        },
    }) as unknown as Vocabulary;
}

interface VocabularyContextType {
    vocabulary: Vocabulary;
    lang: string;
    isLoading: boolean;
    refreshVocabulary: () => Promise<void>;
    setLanguage: (lang: string) => Promise<void>;
}

const VocabularyContext = createContext<VocabularyContextType | null>(null);

export function VocabularyProvider({ children }: { children: ReactNode }) {
    const [vocabulary, setVocabulary] = useState<Vocabulary>(
        createVocabularyProxy({})
    );
    const [lang, setLang] = useState("en");
    const [isLoading, setIsLoading] = useState(true);

    const refreshVocabulary = useCallback(async () => {
        setIsLoading(true);
        try {
            const res = await apiGet(
                "/vocabulary/user",
                UserVocabularyResponseSchema
            );
            setVocabulary(createVocabularyProxy(res.vocabulary));
            setLang(res.currentLang);
        } catch {
            // Keep defaults on error
        } finally {
            setIsLoading(false);
        }
    }, []);

    const setLanguage = useCallback(
        async (newLang: string) => {
            try {
                await apiPatchNoResponse(
                    "/user/lang",
                    UpdateLangRequestSchema,
                    { lang: newLang }
                );
                await refreshVocabulary();
            } catch {
                // Error handling done in component
            }
        },
        [refreshVocabulary]
    );

    useEffect(() => {
        refreshVocabulary();
    }, [refreshVocabulary]);

    return (
        <VocabularyContext.Provider
            value={{
                vocabulary,
                lang,
                isLoading,
                refreshVocabulary,
                setLanguage,
            }}
        >
            {children}
        </VocabularyContext.Provider>
    );
}

export function useVocabulary() {
    const context = useContext(VocabularyContext);
    if (!context) {
        throw new Error("useVocabulary must be used within VocabularyProvider");
    }
    return context;
}
