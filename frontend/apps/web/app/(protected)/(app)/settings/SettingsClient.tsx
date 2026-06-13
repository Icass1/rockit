"use client";

import { JSX, useEffect, useState } from "react";
import { useStore } from "@nanostores/react";
import { type Vocabulary, type VocabularyResponse } from "@rockit/shared";
import { Check, Globe } from "lucide-react";
import { Http } from "@/lib/http";
import { rockIt } from "@/lib/rockit/rockIt";

interface SettingsClientProps {
    vocabulary: VocabularyResponse;
}

interface Language {
    langCode: string;
    language: string;
}

export default function SettingsClient({
    vocabulary,
}: SettingsClientProps): JSX.Element {
    const $vocabulary = useStore(rockIt.vocabularyManager.vocabularyAtom);
    const $username = useStore(rockIt.userManager.usernameAtom);
    const $lang = useStore(rockIt.vocabularyManager.langAtom);

    const [languages, setLanguages] = useState<Language[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect((): void => {
        rockIt.vocabularyManager.setVocabulary(vocabulary);
    }, [vocabulary]);

    useEffect((): void => {
        async function fetchLanguages(): Promise<void> {
            const result = await Http.getAllLanguages();
            if (result.isOk()) {
                setLanguages(result.result.languages);
            } else {
                console.warn("Failed to fetch languages:", result.detail);
            }
            setLoading(false);
        }
        fetchLanguages();
    }, []);

    const handleLanguageChange = async (langCode: string): Promise<void> => {
        const success = await rockIt.userManager.setLangAsync(langCode);
        if (success) {
            rockIt.notificationManager.notifySuccess(
                ($vocabulary as Vocabulary)?.LANGUAGE
                    ? ($vocabulary as Vocabulary).LANGUAGE + " updated"
                    : "Language updated"
            );
        }
    };

    return (
        <div className="mx-auto max-w-2xl p-6">
            <h1 className="mb-8 text-3xl font-bold text-white">
                {($vocabulary as Vocabulary)?.USER_SETTINGS}
            </h1>

            <section className="mb-8 rounded-lg bg-neutral-800 p-6">
                <h2 className="mb-4 flex items-center gap-2 text-xl font-semibold text-white">
                    <Globe className="h-5 w-5" />
                    {($vocabulary as Vocabulary)?.LANGUAGE}
                </h2>

                {loading ? (
                    <p className="text-neutral-400">Loading...</p>
                ) : (
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                        {languages.map(
                            (lang): JSX.Element => (
                                <button
                                    key={lang.langCode}
                                    onClick={(): Promise<void> =>
                                        handleLanguageChange(lang.langCode)
                                    }
                                    className={`flex items-center justify-between rounded-md px-4 py-3 text-left transition ${
                                        $lang === lang.langCode
                                            ? "bg-[#ee1086] text-white"
                                            : "bg-neutral-700 text-neutral-200 hover:bg-neutral-600"
                                    }`}
                                >
                                    <span>{lang.language}</span>
                                    {$lang === lang.langCode && (
                                        <Check className="h-4 w-4" />
                                    )}
                                </button>
                            )
                        )}
                    </div>
                )}
            </section>

            <section className="mb-8 rounded-lg bg-neutral-800 p-6">
                <h2 className="mb-4 text-xl font-semibold text-white">
                    {$username}
                </h2>
                <div className="space-y-2 text-neutral-400">
                    <p>
                        <span className="font-medium text-neutral-200">
                            {$username}
                        </span>
                    </p>
                </div>
            </section>
        </div>
    );
}
