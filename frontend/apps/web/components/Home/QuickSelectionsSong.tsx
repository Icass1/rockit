"use client";

import { useCallback } from "react";
import Image from "next/image";
import { BaseSongWithAlbumResponse } from "@/dto";
import { isSongWithAlbum } from "@/models/types/media";
import useMedia from "@/hooks/useMedia";
import { rockIt } from "@/lib/rockit/rockIt";
import MediaContextMenu from "@/components/MediaContextMenu/MediaContextMenu";

export default function QuickSelectionsSong({
    song,
    songs,
}: {
    song: BaseSongWithAlbumResponse;
    songs: BaseSongWithAlbumResponse[];
}) {
    const $song = useMedia(song);

    const handleClick = useCallback(() => {
        // Set the queue with all songs
        const playableSongs = songs.filter(isSongWithAlbum);
        if (playableSongs.length > 0) {
            rockIt.queueManager.setMedia(playableSongs, "auto-list", "");
            rockIt.queueManager.moveToMedia($song.publicId);
            rockIt.mediaPlayerManager.play();
        }
    }, [$song.publicId, songs]);

    return (
        <MediaContextMenu media={$song}>
            <div
                className="flex h-fit cursor-pointer items-center gap-2 rounded-lg p-2 transition hover:bg-zinc-800"
                onClick={handleClick}
            >
                <Image
                    width={100}
                    height={100}
                    className="aspect-square h-12 min-h-12 w-12 min-w-12 rounded-sm object-cover"
                    src={$song.imageUrl}
                    alt={`Cover of {$song.name}`}
                />
                <div className="flex w-full min-w-0 flex-col justify-center">
                    <span className="w-full min-w-0 truncate text-sm font-semibold text-white">
                        {$song.name}
                    </span>
                    <span className="w-full min-w-0 truncate text-xs text-gray-400">
                        {$song.artists[0].name} {" • "} {$song.album.name}
                    </span>
                </div>
            </div>
        </MediaContextMenu>
    );
}
