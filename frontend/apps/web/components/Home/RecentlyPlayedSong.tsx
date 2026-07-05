"use client";

import { JSX } from "react";
import Image from "next/image";
import { BaseSongWithAlbumResponse } from "@/dto";
import { isSongWithAlbum } from "@/models/types/media";
import useMedia from "@/hooks/useMedia";
import { rockIt } from "@/lib/rockit/rockIt";

export default function RecentlyPlayedSong({
    song,
    songs,
}: {
    song: BaseSongWithAlbumResponse;
    songs: BaseSongWithAlbumResponse[];
}): JSX.Element {
    const $song = useMedia(song);

    const handleClick = (): void => {
        // Set the queue with all songs
        const playableSongs = songs.filter(isSongWithAlbum);
        if (playableSongs.length > 0) {
            rockIt.queueManager.setMedia(playableSongs, "");
            rockIt.queueManager.moveToMedia($song.publicId);
            rockIt.mediaPlayerManager.play();
        }
    };

    return (
        <div
            className="w-40 flex-none cursor-pointer transition md:w-48 md:hover:scale-105"
            onClick={handleClick}
        >
            <Image
                width={400}
                height={400}
                className="aspect-square w-full rounded-lg object-cover"
                src={$song.imageUrl}
                alt={`Cover of {$song.name}`}
            />
            <span className="mt-2 block truncate text-center font-semibold hover:underline">
                {$song.name}
            </span>
            <span className="block truncate text-center text-sm text-gray-400">
                {$song.artists[0].name}
            </span>
        </div>
    );
}
