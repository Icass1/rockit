"use client";

import { JSX } from "react";
import Image from "next/image";
import { BaseSearchResultsItem } from "@/dto";
import { useStore } from "@nanostores/react";
import { rockIt } from "@/lib/rockit/rockIt";
import SearchRail from "@/components/Search/SearchRail";
import SearchResultCard from "@/components/Search/SearchResultCard";

export default function ArtistsSection({
    artists,
}: {
    artists: BaseSearchResultsItem[];
}): JSX.Element | null {
    const $vocabulary = useStore(rockIt.vocabularyManager.vocabularyAtom);

    if (artists.length === 0) return null;

    return (
        <section className="py-2 text-white md:py-6 md:pl-12">
            <h2 className="px-5 text-left text-2xl font-bold md:px-0 md:text-3xl">
                {$vocabulary.ARTISTS}
            </h2>
            <SearchRail kind="artist">
                {artists.map((artist): JSX.Element => (
                    <SearchResultCard
                        key={rockIt.searchManager.getResultKey(artist)}
                        media={artist}
                    >
                        <div className="w-36 flex-none cursor-pointer transition md:w-48 md:hover:scale-105">
                            <Image
                                sizes="(min-width: 768px) 192px, 144px"
                                width={350}
                                height={350}
                                className="aspect-square w-full rounded-full object-cover select-none"
                                src={artist.imageUrl || "/logo-banner.png"}
                                alt={artist.name}
                            />
                            <span className="mt-2 block truncate text-center font-semibold">
                                {artist.name}
                            </span>
                        </div>
                    </SearchResultCard>
                ))}
            </SearchRail>
        </section>
    );
}
