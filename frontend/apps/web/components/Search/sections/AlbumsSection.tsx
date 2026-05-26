"use client";

import { JSX } from "react";
import Image from "next/image";
import { BaseSearchResultsItem } from "@/dto";
import { useStore } from "@nanostores/react";
import { EMediaContextLocation } from "@rockit/shared";
import { rockIt } from "@/lib/rockit/rockIt";
import MediaContextMenu from "@/components/MediaContextMenu/MediaContextMenu";

export default function AlbumsSection({
    albums,
}: {
    albums: BaseSearchResultsItem[];
}): JSX.Element | null {
    const $vocabulary = useStore(rockIt.vocabularyManager.vocabularyAtom);

    if (albums.length === 0) return null;

    return (
        <section className="py-2 text-white md:py-6 md:pl-12">
            <h2 className="px-5 text-left text-2xl font-bold md:px-0 md:text-3xl">
                {$vocabulary.ALBUMS}
            </h2>
            <div className="relative flex items-center gap-4 overflow-x-auto px-8 py-4 md:pr-14 md:pl-4">
                {albums.map(
                    (album): JSX.Element => (
                        <MediaContextMenu
                            key={album.providerUrl}
                            media={album}
                            location={EMediaContextLocation.SEARCH}
                        >
                            <div
                                className={`w-36 flex-none cursor-pointer transition md:w-48 md:hover:scale-105 ${album.downloaded === false && "opacity-50"}`}
                            >
                                <Image
                                    width={350}
                                    height={350}
                                    className="aspect-square w-full rounded-lg object-cover"
                                    src={album.imageUrl}
                                    alt={`Cover of ${album.name}`}
                                />
                                <span className="mt-2 block truncate text-center font-semibold">
                                    {album.name}
                                </span>
                                <span className="block truncate text-center text-sm text-gray-400">
                                    {album.artists.map(
                                        (artist, i): JSX.Element => (
                                            <span key={artist.url}>
                                                {artist.name}
                                                {i < album.artists.length - 1
                                                    ? ", "
                                                    : ""}
                                            </span>
                                        )
                                    )}
                                </span>
                            </div>
                        </MediaContextMenu>
                    )
                )}
            </div>
        </section>
    );
}
