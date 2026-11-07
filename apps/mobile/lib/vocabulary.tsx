import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useRef,
    useState,
    type ReactNode,
} from "react";
import { vocabularyText, type Vocabulary } from "@rockit/shared";
import { Http } from "@/lib/http";
import { vocabularyManager } from "@/lib/managers/vocabularyManager";
import { toasterManager } from "@/lib/toasterManager";

function createVocabularyProxy(data: Record<string, string>): Vocabulary {
    return vocabularyText({ currentLang: "en", vocabulary: data });
}

function getSystemLocale(): string {
    return Intl.DateTimeFormat().resolvedOptions().locale.split(/[-_]/)[0];
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
    const systemLocaleRef = useRef(getSystemLocale());
    const generation = useRef(0);

    const refreshVocabulary = useCallback(async () => {
        const stamp = ++generation.current;
        setIsLoading(true);
        const response = await Http.getUserVocabulary();
        if (stamp !== generation.current) return;

        if (response.isOk()) {
            const res = response.result;
            setVocabulary(createVocabularyProxy(res.vocabulary));
            vocabularyManager.setVocabulary(res.vocabulary);
            setLang(res.currentLang);
            setIsLoading(false);
            return;
        }

        const fallback = await Http.getVocabularyByCode(
            systemLocaleRef.current
        );

        if (stamp !== generation.current) return;
        if (fallback.isOk()) {
            const res = fallback.result;
            setVocabulary(createVocabularyProxy(res.vocabulary));
            vocabularyManager.setVocabulary(res.vocabulary);
            setLang(res.currentLang);
        } else {
            console.error(
                "Failed to load vocabulary:",
                response.message,
                response.detail
            );
        }

        setIsLoading(false);
    }, []);

    const setLanguage = useCallback(
        async (newLang: string) => {
            const response = await Http.updateLang({ lang: newLang });
            if (response.isOk()) {
                toasterManager.notifySuccess(vocabulary.LANGUAGE_CHANGED);
            } else {
                toasterManager.notifyError(vocabulary.LANGUAGE_CHANGE_FAILED);
            }
            await refreshVocabulary();
        },
        [refreshVocabulary, vocabulary]
    );

    useEffect(() => {
        void refreshVocabulary();
        return () => {
            generation.current++;
        };
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
