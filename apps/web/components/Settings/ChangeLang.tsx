"use client";

import { JSX } from "react";
import { useRuntimeServices } from "@/components/providers/RuntimeProvider";
import {
    useLanguage,
    useVocabulary,
} from "@/components/providers/VocabularyProvider";

const LANGUAGES = [
    { value: "en", label: "English" },
    { value: "es", label: "Español" },
    { value: "eu", label: "Euskera" },
    { value: "fr", label: "Français" },
    { value: "it", label: "Italiano" },
    { value: "de", label: "Deutsch" },
    { value: "zh", label: "中文" },
    { value: "ja", label: "日本語" },
    { value: "ar", label: "عربي" },
];

export default function ChangeLang(): JSX.Element {
    const { userManager } = useRuntimeServices();
    const $vocabulary = useVocabulary();
    const $lang = useLanguage();

    return (
        <div className="flex flex-col gap-1.5">
            <label
                htmlFor="lang-select"
                className="text-muted-foreground text-sm font-medium"
            >
                {$vocabulary.LANGUAGE}
            </label>
            <select
                id="lang-select"
                value={$lang}
                onChange={(e): Promise<boolean> =>
                    userManager.setLangAsync(e.currentTarget.value)
                }
                className="border-border bg-muted text-foreground-strong focus:border-primary focus:ring-primary w-full rounded-xl border px-4 py-2.5 text-sm transition-colors focus:ring-1 focus:outline-none"
            >
                {LANGUAGES.map((l): JSX.Element => (
                    <option key={l.value} value={l.value}>
                        {l.label}
                    </option>
                ))}
            </select>
        </div>
    );
}
