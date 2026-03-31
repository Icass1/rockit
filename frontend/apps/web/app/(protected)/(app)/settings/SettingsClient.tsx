"use client";

import { useEffect, useState } from "react";
import { useStore } from "@nanostores/react";
import type { UserVocabularyResponse, Vocabulary } from "@rockit/shared";
import { Check, Globe, Repeat, Shuffle, Volume2 } from "lucide-react";
import { rockIt } from "@/lib/rockit/rockIt";

interface SettingsClientProps {
    vocabulary: UserVocabularyResponse;
}

interface Language {
    langCode: string;
    language: string;
}

export default function SettingsClient({ vocabulary }: SettingsClientProps) {
    const $vocabulary = useStore(rockIt.vocabularyManager.vocabularyAtom);
    const $user = useStore(rockIt.userManager.userAtom);
    const $lang = useStore(rockIt.vocabularyManager.langAtom);

    const [languages, setLanguages] = useState<Language[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        rockIt.vocabularyManager.setVocabulary(vocabulary);
    }, [vocabulary]);

    useEffect(() => {
        async function fetchLanguages() {
            try {
                const res = await fetch(
                    `${rockIt.BACKEND_URL}/vocabulary/languages`,
                    {
                        credentials: "include",
                    }
                );
                if (res.ok) {
                    const data = await res.json();
                    setLanguages(data.languages || []);
                }
            } catch (e) {
                console.warn("Failed to fetch languages:", e);
            } finally {
                setLoading(false);
            }
        }
        fetchLanguages();
    }, []);

    const handleLanguageChange = async (langCode: string) => {
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
                {($vocabulary as Vocabulary)?.USER_SETTINGS || "User Settings"}
            </h1>

            <section className="mb-8 rounded-lg bg-neutral-800 p-6">
                <h2 className="mb-4 flex items-center gap-2 text-xl font-semibold text-white">
                    <Globe className="h-5 w-5" />
                    {($vocabulary as Vocabulary)?.LANGUAGE || "Language"}
                </h2>

                {loading ? (
                    <p className="text-neutral-400">Loading...</p>
                ) : (
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                        {languages.map((lang) => (
                            <button
                                key={lang.langCode}
                                onClick={() =>
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
                        ))}
                    </div>
                )}
            </section>

            <section className="mb-8 rounded-lg bg-neutral-800 p-6">
                <h2 className="mb-4 text-xl font-semibold text-white">
                    {$user?.username}
                </h2>
                <div className="space-y-2 text-neutral-400">
                    <p>
                        <span className="font-medium text-neutral-200">
                            {$user?.username}
                        </span>
                    </p>
                </div>
            </section>
        </div>
    );
}
