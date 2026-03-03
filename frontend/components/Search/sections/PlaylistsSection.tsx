"use client";

import Image from "next/image";
import Link from "next/link";
import { BaseSearchResultsItem } from "@/dto";
import { useLanguage } from "@/contexts/LanguageContext";

export default function PlaylistsSection({
    playlists,
}: {
    playlists: BaseSearchResultsItem[];
}) {
    const { langFile: lang } = useLanguage();

    if (!lang || playlists.length === 0) return null;

    return (
        <section className="py-2 text-white md:py-6 md:pl-12">
            <h2 className="px-5 text-left text-2xl font-bold md:px-0 md:text-3xl">
                {lang.playlists}
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
                            src={playlist.imageUrl || "/api/image/song-placeholder.png"}
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
