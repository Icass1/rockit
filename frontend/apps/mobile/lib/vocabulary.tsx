import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useState,
    type ReactNode,
} from "react";
import { type Vocabulary } from "@rockit/shared";
import { Http } from "@/lib/http";
import { toasterManager } from "@/lib/toasterManager";

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
        const response = await Http.getUserVocabulary();

        if (!response.isOk()) {
            console.error(response.message, response.detail);
            toasterManager.notifyError("Failed to load vocabulary");
            setIsLoading(false);
            return;
        }

        const res = response.result;

        setVocabulary(createVocabularyProxy(res.vocabulary));
        setLang(res.currentLang);
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
