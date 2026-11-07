"use client";

import { useId, type JSX } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useStore } from "@nanostores/react";
import { rockIt } from "@/lib/rockit/rockIt";
import { useVocabulary } from "@/components/providers/VocabularyProvider";

export default function SearchBarInput(): JSX.Element {
    const value = useStore(rockIt.searchManager.inputAtom);
    const id = useId();
    const $vocabulary = useVocabulary();
    const pathname = usePathname();
    const router = useRouter();
    const searching = useStore(rockIt.searchManager.searchingAtom);

    return (
        <div className="relative top-1/2 mx-auto w-full -translate-y-1/2">
            <input
                type="search"
                id={id}
                aria-label={$vocabulary.SEARCH_BAR}
                maxLength={200}
                value={value}
                onChange={(e): void => {
                    const query = e.target.value;
                    rockIt.searchManager.scheduleSearch(query);
                }}
                onClick={(): void => {
                    if (pathname !== "/search") router.push("/search");
                }}
                className="bg-secondary text-foreground-strong placeholder:text-muted-foreground focus-visible:outline-primary z-10 block h-10 w-full rounded-full px-10 text-base font-semibold shadow placeholder:opacity-100 focus-visible:outline-2 focus-visible:outline-offset-2 md:z-50"
                style={{
                    backgroundImage: "url(/search-icon.png)",
                    backgroundPosition: "15px center",
                    backgroundSize: "14px",
                    backgroundRepeat: "no-repeat",
                }}
                placeholder={$vocabulary.SEARCH_BAR}
            />

            {searching && (
                <div className="pointer-events-none absolute top-1/2 right-4 -translate-y-1/2">
                    <div className="border-border-strong h-4 w-4 animate-spin rounded-full border-2 border-t-(--color-rockit-pink)" />
                </div>
            )}
        </div>
    );
}
