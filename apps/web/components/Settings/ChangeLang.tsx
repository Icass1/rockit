"use client";

import type { JSX } from "react";
import { useAsyncResource } from "@rockit/ui/headless/useAsyncResource";
import { Http } from "@/lib/http";
import { useRuntimeServices } from "@/components/providers/RuntimeProvider";
import {
    useLanguage,
    useVocabulary,
} from "@/components/providers/VocabularyProvider";

export default function ChangeLang(): JSX.Element {
    const { userManager } = useRuntimeServices();
    const vocabulary = useVocabulary();
    const lang = useLanguage();
    const resource = useAsyncResource(async () => {
        const result = await Http.getAllLanguages();
        if (!result.isOk()) throw new Error(result.message);
        return result.result.languages;
    });
    const languages = resource.data ?? [{ langCode: lang, language: lang }];
    return (
        <div className="flex flex-col gap-1.5">
            <label
                htmlFor="lang-select"
                className="text-muted-foreground text-sm font-medium"
            >
                {vocabulary.LANGUAGE}
            </label>
            <select
                id="lang-select"
                value={lang}
                disabled={resource.loading || !!resource.error}
                onChange={(event) =>
                    void userManager.setLangAsync(event.currentTarget.value)
                }
                className="border-border bg-muted text-foreground-strong focus:border-primary focus:ring-primary w-full rounded-xl border px-4 py-2.5 text-sm transition-colors focus:ring-1 focus:outline-none"
            >
                {languages.map((language) => (
                    <option key={language.langCode} value={language.langCode}>
                        {language.language}
                    </option>
                ))}
            </select>
            {resource.error && (
                <button
                    type="button"
                    onClick={() => void resource.refresh()}
                    className="text-destructive"
                >
                    {vocabulary.RETRY}
                </button>
            )}
        </div>
    );
}
