import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useRef,
    useState,
    type ReactNode,
} from "react";
import { type Vocabulary } from "@rockit/shared";
import { NativeModules, Platform } from "react-native";
import { Http } from "@/lib/http";
import { toasterManager } from "@/lib/toasterManager";

function createVocabularyProxy(data: Record<string, string>): Vocabulary {
    return new Proxy(data, {
        get(target, prop: string) {
            return target[prop] ?? prop;
        },
    }) as unknown as Vocabulary;
}

function getSystemLocale(): string {
    try {
        if (Platform.OS === "ios") {
            const settings = NativeModules.SettingsManager?.settings;
            const locale =
                settings?.AppleLocale ?? settings?.AppleLanguages?.[0];
            if (locale) return locale.substring(0, 2);
        } else {
            const locale = NativeModules.I18nManager?.localeIdentifier;
            if (locale) return locale.substring(0, 2);
        }
    } catch {
        // ignore
    }
    return "en";
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

    const refreshVocabulary = useCallback(async () => {
        setIsLoading(true);
        const response = await Http.getUserVocabulary();

        if (response.isOk()) {
            const res = response.result;
            setVocabulary(createVocabularyProxy(res.vocabulary));
            setLang(res.currentLang);
            setIsLoading(false);
            return;
        }

        const fallback = await Http.getVocabularyByCode(
            systemLocaleRef.current
        );

        if (fallback.isOk()) {
            const res = fallback.result;
            setVocabulary(createVocabularyProxy(res.vocabulary));
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
