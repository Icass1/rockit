"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { BaseArtistResponse, BaseSongWithAlbumResponse } from "@/packages/dto";
import { AlbumManager } from "@/packages/lib/managers/albumManager";

export default function SongPageTopArtistSongs({
    artist,
}: {
    artist: BaseArtistResponse;
}) {
    const [artistSongs, setArtistSongs] =
        useState<BaseSongWithAlbumResponse[]>();

    useEffect(() => {
        console.log("(SongPageTopArtistSongs)", { setArtistSongs });
    }, []);

    const handleSongClick = (song: BaseSongWithAlbumResponse) => {
        if (!artistSongs) return;
        AlbumManager.playAlbum(
            artistSongs,
            "album",
            artist.publicId,
            song.publicId
        );
    };

    return (
        <section className="relative mx-auto w-full rounded-lg bg-[#3030306f] px-4 py-4 md:px-8">
            <h2 className="px-5 text-center text-2xl font-bold md:px-0 md:text-left md:text-3xl">
                More songs from {artist.name}
            </h2>
            <div className="relative flex items-center gap-5 overflow-x-auto px-10 py-4 md:[scrollbar-gutter:stable]">
                {artistSongs?.map((song) => (
                    <div
                        key={song.publicId}
                        className="w-40 flex-none cursor-pointer transition hover:scale-105 md:w-48"
                        onClick={() => handleSongClick(song)}
                    >
                        <Image
                            src={song.album.imageUrl}
                            alt="Song Cover"
                            className="aspect-square w-full rounded-lg object-cover"
                        />
                        <span className="mt-2 block truncate font-semibold">
                            {song.name}
                        </span>
                        <span className="block truncate text-sm text-gray-400">
                            {song.album.name}
                        </span>
                    </div>
                ))}
            </div>
        </section>
    );
}
