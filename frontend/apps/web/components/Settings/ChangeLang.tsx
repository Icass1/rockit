"use client";

import { useStore } from "@nanostores/react";
import { rockIt } from "@/lib/rockit/rockIt";

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

export default function ChangeLang() {
    const $vocabulary = useStore(rockIt.vocabularyManager.vocabularyAtom);
    const $lang = useStore(rockIt.vocabularyManager.langAtom);

    return (
        <div className="flex flex-col gap-1.5">
            <label
                htmlFor="lang-select"
                className="text-sm font-medium text-neutral-400"
            >
                {$vocabulary.LANGUAGE}
            </label>
            <select
                id="lang-select"
                value={$lang}
                onChange={(e) =>
                    rockIt.userManager.setLangAsync(e.currentTarget.value)
                }
                className="w-full rounded-xl border border-neutral-700 bg-neutral-800 px-4 py-2.5 text-sm text-white transition-colors focus:border-[#ee1086] focus:outline-none focus:ring-1 focus:ring-[#ee1086]"
            >
                {LANGUAGES.map((l) => (
                    <option key={l.value} value={l.value}>
                        {l.label}
                    </option>
                ))}
            </select>
        </div>
    );
}
