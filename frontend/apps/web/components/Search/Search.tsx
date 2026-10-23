"use client";

import { useEffect, type JSX } from "react";
import Image from "next/image";
import { useStore } from "@nanostores/react";
import { rockIt } from "@/lib/rockit/rockIt";
import { useSearchResults } from "@/components/Search/hooks/useSearchResults";
import SearchBarInput from "@/components/Search/SearchBarInput";
import AlbumsSection from "@/components/Search/sections/AlbumsSection";
import ArtistsSection from "@/components/Search/sections/ArtistsSection";
import PlaylistsSection from "@/components/Search/sections/PlaylistsSection";
import RadioSection from "@/components/Search/sections/RadioSection";
import SongsSection from "@/components/Search/sections/SongsSection";
import VideosSection from "@/components/Search/sections/VideosSection";

function EmptyState(): JSX.Element {
    const $vocabulary = useStore(rockIt.vocabularyManager.vocabularyAtom);

    return (
        <section className="flex flex-col items-center justify-center px-7 py-36 text-center text-white md:pl-12">
            <h2 className="text-2xl font-bold md:text-3xl">
                {$vocabulary.SEARCH_EMPTY1}
            </h2>
            <p className="mt-10 text-lg md:mt-2 md:text-xl">
                {$vocabulary.SEARCH_EMPTY2}
            </p>
            <div className="relative h-36 w-46 md:mt-10">
                <Image
                    src="/logo-banner.png"
                    alt=""
                    fill
                    priority
                    className="object-contain"
                    sizes="144px"
                />
            </div>
        </section>
    );
}

function SearchResults(): JSX.Element {
    const { results, searching, query } = useSearchResults();

    const vocabulary = useStore(rockIt.vocabularyManager.vocabularyAtom);
    const error = useStore(rockIt.searchManager.errorAtom);
    const providers = useStore(rockIt.searchManager.providersAtom);

    if (query.length < 2) return <EmptyState />;

    if (searching && !results?.results.length) {
        return (
            <div
                role="status"
                aria-label={vocabulary.SEARCH_LOADING}
                className="space-y-8 px-5 py-6 md:pl-12"
            >
                {[0, 1, 2].map((section) => (
                    <div key={section} aria-hidden="true">
                        <div className="mb-4 h-7 w-36 rounded bg-neutral-800 motion-safe:animate-pulse" />
                        <div className="flex gap-4 overflow-hidden">
                            {[0, 1, 2, 3, 4].map((card) => (
                                <div
                                    key={card}
                                    className="aspect-square w-36 shrink-0 rounded-lg bg-neutral-800 motion-safe:animate-pulse md:w-48"
                                />
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        );
    }

    const mediaResults = results?.results ?? [];

    return (
        <div className="overflow-y-auto" aria-busy={searching}>
            {searching && (
                <p
                    role="status"
                    className="px-5 py-2 text-sm text-neutral-300 md:pl-12"
                >
                    {vocabulary.SEARCH_LOADING}
                </p>
            )}
            {error && (
                <div
                    role="status"
                    className="flex flex-wrap items-center gap-3 px-5 py-3 text-sm text-neutral-300 md:pl-12"
                >
                    <span>{vocabulary.ERROR_SEARCHING}</span>
                    <button
                        type="button"
                        onClick={(): void => {
                            void rockIt.searchManager.search(query);
                        }}
                        className="min-h-11 rounded-full border border-neutral-600 px-5 text-white hover:bg-neutral-800 focus-visible:outline-2 focus-visible:outline-white"
                    >
                        {vocabulary.RETRY}
                    </button>
                </div>
            )}
            {!searching && !error && mediaResults.length === 0 && (
                <p
                    role="status"
                    className="px-5 py-12 text-center text-neutral-300"
                >
                    {vocabulary.SEARCH_NO_RESULTS}
                </p>
            )}
            <SongsSection
                songs={mediaResults.filter(
                    (item): boolean => item.type === "song"
                )}
            />
            <AlbumsSection
                albums={mediaResults.filter(
                    (item): boolean => item.type === "album"
                )}
            />
            <ArtistsSection
                artists={mediaResults.filter(
                    (item): boolean => item.type === "artist"
                )}
            />
            <PlaylistsSection
                playlists={mediaResults.filter(
                    (item): boolean => item.type === "playlist"
                )}
            />
            <VideosSection
                videos={mediaResults.filter(
                    (item): boolean => item.type === "video"
                )}
            />
            {providers
                .filter(
                    (provider) =>
                        provider.onDemand ||
                        provider.loadingTypes.includes("video")
                )
                .map((provider) => (
                    <div key={provider.id} className="px-5 py-4 md:pl-12">
                        <button
                            type="button"
                            disabled={searching || !provider.onDemand}
                            aria-busy={!provider.onDemand}
                            onClick={(): void => {
                                void rockIt.searchManager.loadProvider(
                                    provider.id
                                );
                            }}
                            className="min-h-11 rounded-full border border-neutral-600 px-5 py-3 text-sm font-semibold text-white hover:bg-neutral-800 focus-visible:outline-2 focus-visible:outline-white disabled:opacity-50"
                        >
                            {vocabulary.SEARCH} · {provider.name}
                        </button>
                    </div>
                ))}
            <RadioSection
                stations={mediaResults.filter(
                    (item): boolean => item.type === "radio"
                )}
            />
        </div>
    );
}

export default function Search({
    initialQuery,
}: {
    initialQuery?: string;
}): JSX.Element {
    useEffect(() => {
        if (initialQuery) rockIt.searchManager.scheduleSearch(initialQuery);
    }, [initialQuery]);
    return (
        <>
            <section className="mt-0 block h-28 px-5 md:mt-20 md:hidden">
                <SearchBarInput />
            </section>
            <SearchResults />
        </>
    );
}
