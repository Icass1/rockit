"use client";

import Image from "next/image";
import Link from "next/link";
import { useStore } from "@nanostores/react";
import { BaseSearchResultsItem } from "@/packages/dto";
import { rockIt } from "@/packages/lib/rockit/rockIt";

export default function PlaylistsSection({
    playlists,
}: {
    playlists: BaseSearchResultsItem[];
}) {
    const $vocabulary = useStore(rockIt.vocabularyManager.vocabularyAtom);

    if (playlists.length === 0) return null;

    return (
        <section className="py-2 text-white md:py-6 md:pl-12">
            <h2 className="px-5 text-left text-2xl font-bold md:px-0 md:text-3xl">
                {$vocabulary.PLAYLISTS}
            </h2>
            <div className="relative flex items-center gap-4 overflow-x-auto px-8 py-4 md:pr-14 md:pl-4">
                {playlists.map((playlist) => (
                    <Link
                        href={playlist.url}
                        prefetch={false}
                        className="w-36 flex-none transition md:w-48 md:hover:scale-105"
                        key={playlist.url}
                    >
                        <Image
                            width={350}
                            height={350}
                            className="aspect-square w-full rounded-lg object-cover"
                            src={
                                playlist.imageUrl ||
                                rockIt.PLAYLIST_PLACEHOLDER_IMAGE_URL
                            }
                            alt={`Cover of ${playlist.title}`}
                        />
                        <span className="mt-2 block truncate text-center font-semibold">
                            {playlist.title}
                        </span>
                        <span className="block truncate text-center text-sm text-gray-400">
                            {playlist.artists[0]?.name || "Unknown"}
                        </span>
                    </Link>
                ))}
            </div>
        </section>
    );
}
