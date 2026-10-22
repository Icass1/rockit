"use client";

import { useId, type JSX } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useStore } from "@nanostores/react";
import { rockIt } from "@/lib/rockit/rockIt";

export default function SearchBarInput(): JSX.Element {
    const value = useStore(rockIt.searchManager.inputAtom);
    const id = useId();
    const $vocabulary = useStore(rockIt.vocabularyManager.vocabularyAtom);
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
                className="z-10 block h-10 w-full rounded-full bg-neutral-900 px-10 text-base font-semibold shadow focus:outline-0 md:z-50"
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
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-neutral-600 border-t-(--color-rockit-pink)" />
                </div>
            )}
        </div>
    );
}
