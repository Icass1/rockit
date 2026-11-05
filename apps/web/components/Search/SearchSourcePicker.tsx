"use client";

import type { JSX } from "react";
import { EProviders, type BaseSearchResultsItem } from "@rockit/shared";
import { Check } from "lucide-react";
import { useVocabulary } from "@/components/providers/VocabularyProvider";
import ProviderTag from "@/components/ProviderTag/ProviderTag";

export default function SearchSourcePicker({
    sources,
    selected,
    onSelect,
}: {
    sources: readonly BaseSearchResultsItem[];
    selected: string;
    onSelect: (url: string) => void;
}): JSX.Element {
    const vocabulary = useVocabulary();
    return (
        <section className="border-border-strong mb-2 border-b pb-3 md:max-w-sm">
            <p className="text-foreground px-2 py-2 text-sm font-semibold">
                {vocabulary.SEARCH_CHOOSE_SOURCE}
            </p>
            <div
                className="flex flex-wrap gap-2 px-2"
                role="group"
                aria-label={vocabulary.SEARCH_CHOOSE_SOURCE}
            >
                {sources.map((source) => (
                    <button
                        key={source.providerUrl}
                        type="button"
                        aria-pressed={source.providerUrl === selected}
                        onClick={(event): void => {
                            event.stopPropagation();
                            onSelect(source.providerUrl);
                        }}
                        className="border-border-strong bg-secondary text-foreground-strong hover:bg-accent focus-visible:outline-foreground-strong aria-pressed:border-foreground-strong flex min-h-11 items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm focus-visible:outline-2"
                    >
                        {Object.values(EProviders).some(
                            (name) => name === source.provider
                        ) && (
                            <span aria-hidden="true">
                                <ProviderTag name={source.provider} iconOnly />
                            </span>
                        )}
                        <span>
                            {source.provider}
                            {source.downloaded && (
                                <span className="text-foreground block text-xs">
                                    {vocabulary.SEARCH_SOURCE_DOWNLOADED}
                                </span>
                            )}
                        </span>
                        {source.providerUrl === selected && (
                            <Check
                                className="h-4 w-4 shrink-0"
                                aria-hidden="true"
                            />
                        )}
                    </button>
                ))}
            </div>
        </section>
    );
}
