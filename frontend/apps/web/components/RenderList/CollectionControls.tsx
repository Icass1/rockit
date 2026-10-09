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
            <div className="flex items-center justify-between gap-2">
                <button
                    type="button"
                    disabled={state.loading || state.offset === 0}
                    onClick={() => void pager.previous()}
                    aria-label={vocabulary.PREVIOUS_MEDIA}
                    className="rounded border border-neutral-700 px-3 py-1 disabled:opacity-40"
                >
                    ←
                </button>
                <span aria-live="polite" className="text-sm text-neutral-400">
                    {state.total ? state.offset + 1 : 0}–
                    {Math.min(state.offset + state.media.length, state.total)} /{" "}
                    {state.total}
                </span>
                <button
                    type="button"
                    disabled={state.loading || !state.hasMore}
                    onClick={() => void pager.next()}
                    aria-label={vocabulary.NEXT_MEDIA}
                    className="rounded border border-neutral-700 px-3 py-1 disabled:opacity-40"
                >
                    →
                </button>
            </div>
            {state.error && (
                <div role="alert">
                    {state.error}{" "}
                    <button
                        type="button"
                        onClick={() => void pager.load(state.offset)}
                    >
                        {vocabulary.RETRY}
                    </button>
                </div>
            )}
        </div>
    );
}
