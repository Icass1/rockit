"use client";

import { JSX } from "react";
import Image from "next/image";
import { BaseSearchResultsItem } from "@/dto";
import { useStore } from "@nanostores/react";
import { rockIt } from "@/lib/rockit/rockIt";
import SearchRail from "@/components/Search/SearchRail";
import SearchResultCard from "@/components/Search/SearchResultCard";

export default function SongsSection({
    songs,
}: {
    songs: BaseSearchResultsItem[];
}): JSX.Element | null {
    const $vocabulary = useStore(rockIt.vocabularyManager.vocabularyAtom);

    if (songs.length === 0) return null;

    return (
        <section className="py-2 text-white md:py-6 md:pl-12">
            <h2 className="px-5 text-left text-2xl font-bold md:px-0 md:text-3xl">
                {$vocabulary.SONGS}
            </h2>
            <SearchRail kind="song">
                {songs.map((song): JSX.Element => (
                    <SearchResultCard
                        key={rockIt.searchManager.getResultKey(song)}
                        media={song}
                    >
                        <div className="w-36 flex-none cursor-pointer transition md:w-48 md:hover:scale-105">
                            <Image
                                sizes="(min-width: 768px) 192px, 144px"
                                width={350}
                                height={350}
                                className="aspect-square w-full rounded-lg object-cover select-none"
                                src={
                                    song.imageUrl?.trim() || "/logo-banner.png"
                                }
                                alt={$vocabulary.COVER_OF.replace(
                                    "{name}",
                                    song.name
                                )}
                            />
                            <span className="mt-2 block truncate text-center font-semibold">
                                {song.name}
                            </span>
                            <span className="block truncate text-center text-sm text-gray-400">
                                {song.artists.map((artist, i): JSX.Element => (
                                    <span key={artist.name}>
                                        {artist.name}
                                        {i < song.artists.length - 1
                                            ? ", "
                                            : ""}
                                    </span>
                                ))}
                            </span>
                        </div>
                    </SearchResultCard>
                ))}
            </SearchRail>
        </section>
    );
}
