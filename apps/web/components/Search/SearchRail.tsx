"use client";

import type { JSX, ReactNode } from "react";
import { useStore } from "@nanostores/react";
import type { SearchMediaType } from "@/models/search";
import { rockIt } from "@/lib/rockit/rockIt";

export default function SearchRail({
    kind,
    children,
}: {
    kind: SearchMediaType;
    children: ReactNode;
}): JSX.Element {
    const providers = useStore(rockIt.searchManager.providersAtom);
    const searching = useStore(rockIt.searchManager.searchingAtom);
    const vocabulary = useStore(rockIt.vocabularyManager.vocabularyAtom);
    const loading = providers.some((provider) =>
        provider.loadingTypes.includes(kind)
    );
    const hasMore = providers.some(
        (provider) => provider.hasMoreTypes.includes(kind) && !provider.failed
    );

    const labels = {
        song: vocabulary.SONGS,
        album: vocabulary.ALBUMS,
        artist: vocabulary.ARTISTS,
        playlist: vocabulary.PLAYLISTS,
        video: vocabulary.VIDEOS,
        radio: vocabulary.RADIO_STATIONS,
    };

    return (
        <div
            role="region"
            aria-label={labels[kind]}
            aria-busy={loading}
            tabIndex={0}
            onScroll={(event): void => {
                const rail = event.currentTarget;
                if (
                    rail.scrollLeft > 0 &&
                    rail.scrollWidth - rail.scrollLeft - rail.clientWidth <
                        320 &&
                    !loading &&
                    hasMore
                ) {
                    void rockIt.searchManager.loadMore(kind);
                }
            }}
            className="relative flex items-center gap-4 overflow-x-auto px-8 py-4 outline-offset-[-2px] focus-visible:outline-2 focus-visible:outline-white md:pr-14 md:pl-4"
        >
            {children}
            {hasMore && (
                <button
                    type="button"
                    disabled={loading || searching}
                    onClick={(): void => {
                        void rockIt.searchManager.loadMore(kind);
                    }}
                    className="min-h-11 shrink-0 rounded-full border border-neutral-600 px-5 py-3 text-sm font-semibold text-white hover:bg-neutral-800 focus-visible:outline-2 focus-visible:outline-white disabled:opacity-50"
                >
                    {loading
                        ? vocabulary.SEARCH_LOADING
                        : vocabulary.SEARCH_LOAD_MORE}
                </button>
            )}
        </div>
    );
}
