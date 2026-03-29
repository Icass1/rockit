import React, {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useState,
    type ReactNode,
} from "react";
import {
    DEFAULT_VOCABULARY,
    UserVocabularyResponseSchema,
} from "@rockit/shared";
import { apiFetch, BACKEND_URL } from "./api";

interface VocabularyContextType {
    vocabulary: Record<string, string>;
    lang: string;
    isLoading: boolean;
    refreshVocabulary: () => Promise<void>;
    setLanguage: (lang: string) => Promise<void>;
}

const VocabularyContext = createContext<VocabularyContextType | null>(null);

export function VocabularyProvider({ children }: { children: ReactNode }) {
    const [vocabulary, setVocabulary] = useState(DEFAULT_VOCABULARY);
    const [lang, setLang] = useState("en");
    const [isLoading, setIsLoading] = useState(true);

    const refreshVocabulary = useCallback(async () => {
        setIsLoading(true);
        try {
            const res = await apiFetch(
                "/vocabulary/user",
                UserVocabularyResponseSchema as any
            );
            if (res && typeof res === "object" && "vocabulary" in res) {
                setVocabulary((res as any).vocabulary);
                setLang((res as any).currentLang);
            }
        } catch {
            // Keep defaults on error
        } finally {
            setIsLoading(false);
        }
    }, []);

    const setLanguage = useCallback(
        async (newLang: string) => {
            try {
                const res = await fetch(`${BACKEND_URL}/user/lang`, {
                    method: "PATCH",
                    credentials: "include",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ lang: newLang }),
                });
                if (res.ok) {
                    await refreshVocabulary();
                }
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
