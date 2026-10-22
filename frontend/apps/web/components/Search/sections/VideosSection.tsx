"use client";

import { JSX } from "react";
import Image from "next/image";
import { BaseSearchResultsItem } from "@/dto";
import { useStore } from "@nanostores/react";
import { rockIt } from "@/lib/rockit/rockIt";
import SearchRail from "@/components/Search/SearchRail";
import SearchResultCard from "@/components/Search/SearchResultCard";

export default function VideosSection({
    videos,
}: {
    videos: BaseSearchResultsItem[];
}): JSX.Element | null {
    const vocabulary = useStore(rockIt.vocabularyManager.vocabularyAtom);
    if (videos.length === 0) return null;

    return (
        <section className="py-2 text-white md:py-6 md:pl-12">
            <h2 className="px-5 text-left text-2xl font-bold md:px-0 md:text-3xl">
                {vocabulary.VIDEOS}
            </h2>
            <SearchRail kind="video">
                {videos.map((video): JSX.Element => (
                    <SearchResultCard
                        key={rockIt.searchManager.getResultKey(video)}
                        media={video}
                    >
                        <div className="w-64 flex-none cursor-pointer transition md:w-80 md:hover:scale-105">
                            <Image
                                sizes="(min-width: 768px) 320px, 256px"
                                width={350}
                                height={197}
                                className="aspect-video w-full rounded-lg object-cover select-none"
                                src={video.imageUrl || "/logo-banner.png"}
                                alt={video.name}
                            />
                            <span className="mt-2 block truncate text-left font-semibold">
                                {video.name}
                            </span>
                            <span className="block truncate text-center text-sm text-gray-400">
                                {video.artists.map((artist, i): JSX.Element => (
                                    <span key={artist.name}>
                                        {artist.name}
                                        {i < video.artists.length - 1
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
