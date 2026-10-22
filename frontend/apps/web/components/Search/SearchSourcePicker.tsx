"use client";

import type { JSX } from "react";
import { useStore } from "@nanostores/react";
import { EProviders, type BaseSearchResultsItem } from "@rockit/shared";
import { Check } from "lucide-react";
import { rockIt } from "@/lib/rockit/rockIt";
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
    const vocabulary = useStore(rockIt.vocabularyManager.vocabularyAtom);
    return (
        <section className="mb-2 border-b border-neutral-600 pb-3 md:max-w-sm">
            <p className="px-2 py-2 text-sm font-semibold text-neutral-300">
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
                        className="flex min-h-11 items-center gap-2 rounded-lg border border-neutral-600 bg-neutral-900 px-3 py-2 text-left text-sm text-white hover:bg-neutral-700 focus-visible:outline-2 focus-visible:outline-white aria-pressed:border-white"
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
                                <span className="block text-xs text-neutral-300">
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
