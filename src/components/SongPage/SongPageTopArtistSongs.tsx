"use client";

import { RockItArtist } from "@/lib/rockit/rockItArtist";
import Image from "next/image";
import Link from "next/link";

export default function SongPageTopArtistSongs({
    artist,
}: {
    artist: RockItArtist;
}) {
    const artistSongs = undefined;

    return (
        <section className="relative mx-auto w-full rounded-lg bg-[#3030306f] px-4 py-4 md:px-8">
            <h2 className="px-5 text-center text-2xl font-bold md:px-0 md:text-left md:text-3xl">
                More songs from {artist.name}
            </h2>
            <div className="relative flex items-center gap-5 overflow-x-auto px-10 py-4 md:[scrollbar-gutter:stable]">
                {artistSongs?.tracks
                    .filter((t) => t.id !== id)
                    .map((t) => (
                        <Link
                            key={t.id}
                            href={`/song/${t.id}`}
                            className="w-40 flex-none transition hover:scale-105 md:w-48"
                        >
                            <Image
                                src={
                                    t.album?.images[0]?.url ||
                                    "/song-placeholder.png"
                                }
                                alt="Song Cover"
                                className="aspect-square w-full rounded-lg object-cover"
                            />
                            <span className="mt-2 block truncate font-semibold">
                                {t.name}
                            </span>
                            <span className="block truncate text-sm text-gray-400">
                                {t.album.name}
                            </span>
                        </Link>
                    ))}
            </div>
        </section>
    );
}
