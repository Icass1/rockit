"use client";

import type { JSX } from "react";
import { useStore } from "@nanostores/react";
import { CollectionPager } from "@rockit/shared";
import { rockIt } from "@/lib/rockit/rockIt";

export default function CollectionControls({
    pager,
}: {
    pager: CollectionPager;
}): JSX.Element {
    const state = useStore(pager.state);
    const vocabulary = useStore(rockIt.vocabularyManager.vocabularyAtom);
    return (
        <div className="flex flex-col gap-2" aria-busy={state.loading}>
            <input
                type="search"
                aria-label={vocabulary.SEARCH}
                placeholder={vocabulary.SEARCH}
                value={state.query}
                onChange={(event) => pager.search(event.target.value)}
                className="rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2"
            />
            {state.error && (
                <div role="alert">
                    {state.error}{" "}
                    <button type="button" onClick={() => void pager.retry()}>
                        {vocabulary.RETRY}
                    </button>
                </div>
            )}
        </div>
    );
}
