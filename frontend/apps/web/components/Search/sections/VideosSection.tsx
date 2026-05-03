"use client";

import Image from "next/image";
import { BaseSearchResultsItem } from "@/dto";
import SearchItemContextMenu from "@/components/Search/SearchItemContextMenu";

export default function VideosSection({
    videos,
}: {
    videos: BaseSearchResultsItem[];
}) {
    if (videos.length === 0) return null;

    return (
        <section className="py-2 text-white md:py-6 md:pl-12">
            <h2 className="px-5 text-left text-2xl font-bold md:px-0 md:text-3xl">
                YouTube Videos
            </h2>
            <div className="relative flex items-center gap-4 overflow-x-auto px-8 py-4 md:pr-14 md:pl-4">
                {videos.map((video) => (
                    <SearchItemContextMenu
                        key={video.providerUrl}
                        item={video}
                        className="w-64 flex-none cursor-pointer transition md:w-80 md:hover:scale-105"
                    >
                        <Image
                            width={350}
                            height={197}
                            className="aspect-video w-full rounded-lg object-cover"
                            src={video.imageUrl}
                            alt={`Thumbnail of ${video.name}`}
                        />
                        <span className="mt-2 block truncate text-left font-semibold">
                            {video.name}
                        </span>
                        <span className="block truncate text-center text-sm text-gray-400">
                            {video.artists.map((artist, i) => (
                                <span key={artist.name}>
                                    {artist.name}
                                    {i < video.artists.length - 1 ? ", " : ""}
                                </span>
                            ))}
                        </span>
                    </SearchItemContextMenu>
                ))}
            </div>
        </section>
    );
}
