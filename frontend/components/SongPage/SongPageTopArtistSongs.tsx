"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Artist } from "@/lib/rockit/artist";
import { rockIt } from "@/lib/rockit/rockIt";
import { SongWithAlbum } from "@/lib/rockit/songWithAlbum";
import { getBestImage } from "@/lib/utils/getBestImage";

export default function SongPageTopArtistSongs({ artist }: { artist: Artist }) {
    const [artistSongs, setArtistSongs] = useState<SongWithAlbum[]>();

    useEffect(() => {
        console.log("(SongPageTopArtistSongs)", { setArtistSongs });
    }, []);

    return (
        <section className="relative mx-auto w-full rounded-lg bg-[#3030306f] px-4 py-4 md:px-8">
            <h2 className="px-5 text-center text-2xl font-bold md:px-0 md:text-left md:text-3xl">
                More songs from {artist.name}
            </h2>
            <div className="relative flex items-center gap-5 overflow-x-auto px-10 py-4 md:[scrollbar-gutter:stable]">
                {artistSongs?.map((song) => (
                    <Link
                        key={song.publicId}
                        href={`/song/${song.publicId}`}
                        className="w-40 flex-none transition hover:scale-105 md:w-48"
                    >
                        <Image
                            src={
                                getBestImage(song.album.externalImages)?.url ??
                                rockIt.ALBUM_PLACEHOLDER_IMAGE_URL
                            }
                            alt="Song Cover"
                            className="aspect-square w-full rounded-lg object-cover"
                        />
                        <span className="mt-2 block truncate font-semibold">
                            {song.name}
                        </span>
                        <span className="block truncate text-sm text-gray-400">
                            {song.album.name}
                        </span>
                    </Link>
                ))}
            </div>
        </section>
    );
}
