"use client";

import { JSX, useEffect, useState } from "react";
import { useStore } from "@nanostores/react";
import { type VocabularyResponse } from "@rockit/shared";
import { Check, Globe } from "lucide-react";
import { Http } from "@/lib/http";
import { rockIt } from "@/lib/rockit/rockIt";
import { useVocabulary } from "@/components/providers/VocabularyProvider";

interface SettingsClientProps {
    vocabulary: VocabularyResponse;
}

interface Language {
    langCode: string;
    language: string;
}

export default function SettingsClient({
    vocabulary: initialVocabulary,
}: SettingsClientProps): JSX.Element {
    const vocabulary = useVocabulary();

    const $vocabulary = useStore(rockIt.vocabularyManager.vocabularyAtom);
    const $username = useStore(rockIt.userManager.usernameAtom);
    const $lang = useStore(rockIt.vocabularyManager.langAtom);

    const [languages, setLanguages] = useState<Language[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect((): void => {
        rockIt.vocabularyManager.setVocabulary(initialVocabulary);
    }, [initialVocabulary]);

    useEffect((): void => {
        async function fetchLanguages(): Promise<void> {
            const result = await Http.getAllLanguages();
            if (result.isOk()) {
                setLanguages(result.result.languages);
            } else {
                rockIt.notificationManager.notifyError(vocabulary.ERROR);
            }
            setLoading(false);
        }
        fetchLanguages();
    }, [vocabulary.ERROR]);

    const handleLanguageChange = async (langCode: string): Promise<void> => {
        const success = await rockIt.userManager.setLangAsync(langCode);
        if (success) {
            rockIt.notificationManager.notifySuccess(
                $vocabulary.LANGUAGE_CHANGED
            );
        }
    };

    return (
        <div className="mx-auto max-w-2xl p-6">
            <h1 className="text-foreground-strong mb-8 text-3xl font-bold">
                {$vocabulary.USER_SETTINGS}
            </h1>

            <section className="bg-muted mb-8 rounded-lg p-6">
                <h2 className="text-foreground-strong mb-4 flex items-center gap-2 text-xl font-semibold">
                    <Globe className="h-5 w-5" />
                    {$vocabulary.LANGUAGE}
                </h2>

                {loading ? (
                    <p className="text-muted-foreground">
                        {vocabulary.MOBILE_LOADING}
                    </p>
                ) : (
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                        {languages.map((lang): JSX.Element => (
                            <button
                                key={lang.langCode}
                                onClick={(): Promise<void> =>
                                    handleLanguageChange(lang.langCode)
                                }
                                className={`flex items-center justify-between rounded-md px-4 py-3 text-left transition ${
                                    $lang === lang.langCode
                                        ? "bg-primary text-foreground-strong"
                                        : "bg-accent text-foreground hover:bg-hover"
                                }`}
                            >
                                <span>{lang.language}</span>
                                {$lang === lang.langCode && (
                                    <Check className="h-4 w-4" />
                                )}
                            </button>
                        ))}
                    </div>
                )}
            </section>

            <section className="bg-muted mb-8 rounded-lg p-6">
                <h2 className="text-foreground-strong mb-4 text-xl font-semibold">
                    {$username}
                </h2>
                <div className="text-muted-foreground space-y-2">
                    <p>
                        <span className="text-foreground font-medium">
                            {$username}
                        </span>
                    </p>
                </div>
            </section>
        </div>
    );
}
