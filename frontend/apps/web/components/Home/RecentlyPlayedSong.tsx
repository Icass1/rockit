"use client";

import { JSX } from "react";
import Image from "next/image";
import { useStore } from "@nanostores/react";
import { BaseSongWithAlbumResponse } from "@/dto";
import { isSongWithAlbum } from "@/models/types/media";
import useMedia from "@/hooks/useMedia";
import { rockIt } from "@/lib/rockit/rockIt";

export default function RecentlyPlayedSong({
    song,
    songs,
    className,
}: {
    song: BaseSongWithAlbumResponse;
    songs: BaseSongWithAlbumResponse[];
    className?: string;
}): JSX.Element {
    const $song = useMedia(song);
    const $vocabulary = useStore(rockIt.vocabularyManager.vocabularyAtom);

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
            className={`${className ?? "w-40 md:w-48"} flex-none cursor-pointer transition md:hover:scale-105`}
            onClick={handleClick}
        >
            <Image
                width={400}
                height={400}
                className="aspect-square w-full rounded-lg object-cover"
                src={$song.imageUrl}
                alt={$vocabulary.COVER_OF.replace("{name}", $song.name)}
            />
            <span className="mt-2 block truncate text-center font-semibold hover:underline">
                {$song.name}
            </span>
            <span className="block truncate text-center text-sm text-gray-400">
                {$song.artists[0]?.name ?? $vocabulary.UNKNOWN}
            </span>
        </div>
    );
}
