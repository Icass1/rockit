"use client";

import { useEffect, useRef, useState, type JSX } from "react";
import { useStore } from "@nanostores/react";
import { CollectionPager } from "@rockit/shared";
import { Search, X } from "lucide-react";
import { useVocabulary } from "@/components/providers/VocabularyProvider";

export default function CollectionControls({
    pager,
    showSearch = true,
}: {
    pager: CollectionPager;
    showSearch?: boolean;
}): JSX.Element {
    const state = useStore(pager.state);
    const vocabulary = useVocabulary();
    const [open, setOpen] = useState<boolean>(false);
    const inputRef = useRef<HTMLInputElement>(null);
    // Keep the pill expanded while a query is active, even if the row is
    // unmounted/remounted by virtualization and local state resets.
    const searchOpen = open || state.query !== "";

    useEffect(() => {
        if (open) inputRef.current?.focus();
    }, [open]);

    const closeSearch = (): void => {
        setOpen(false);
        if (state.query) pager.search("");
    };

    return (
        <div className="flex items-center gap-2" aria-busy={state.loading}>
            {state.error && (
                <div role="alert" className="min-w-0 flex-1 text-sm">
                    {state.error}{" "}
                    <button
                        type="button"
                        onClick={() => void pager.retry()}
                        className="text-foreground hover:text-foreground-strong underline"
                    >
                        {vocabulary.RETRY}
                    </button>
                </div>
            )}
            {showSearch && (
                <div
                    className={`bg-muted ml-auto flex h-9 shrink-0 items-center overflow-hidden rounded-full transition-[width] duration-300 ease-in-out ${
                        searchOpen ? "w-64" : "hover:bg-accent w-9"
                    }`}
                >
                    <button
                        type="button"
                        onClick={(): void => setOpen(true)}
                        title={vocabulary.SEARCH}
                        aria-label={vocabulary.SEARCH}
                        aria-expanded={searchOpen}
                        className="text-muted-foreground hover:text-foreground-strong flex h-9 w-9 shrink-0 items-center justify-center transition select-none"
                    >
                        <Search className="h-4 w-4" />
                    </button>
                    <input
                        ref={inputRef}
                        type="search"
                        aria-label={vocabulary.SEARCH}
                        placeholder={vocabulary.SEARCH}
                        value={state.query}
                        onChange={(event): void =>
                            pager.search(event.target.value)
                        }
                        onKeyDown={(event): void => {
                            if (event.key === "Escape") closeSearch();
                        }}
                        className={`text-foreground-strong placeholder-muted-foreground h-9 min-w-0 flex-1 bg-transparent pr-1 text-sm transition-opacity duration-200 focus:outline-none [&::-webkit-search-cancel-button]:hidden ${
                            searchOpen
                                ? "opacity-100 delay-150"
                                : "pointer-events-none opacity-0"
                        }`}
                    />
                    <button
                        type="button"
                        onClick={closeSearch}
                        title={vocabulary.CANCEL}
                        aria-label={vocabulary.CANCEL}
                        className={`text-muted-foreground hover:text-foreground-strong flex h-9 w-9 shrink-0 items-center justify-center transition ${
                            searchOpen
                                ? "opacity-100"
                                : "pointer-events-none opacity-0"
                        }`}
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>
            )}
        </div>
    );
}
