"use client";

import { useCallback, type JSX } from "react";
import Image from "next/image";
import { BaseSongWithAlbumResponse } from "@/dto";
import { useStore } from "@nanostores/react";
import { EMediaContextLocation } from "@rockit/shared";
import { isSongWithAlbum } from "@/models/types/media";
import useMedia from "@/hooks/useMedia";
import { rockIt } from "@/lib/rockit/rockIt";
import { OfflineIndicator } from "@/components/OfflineIndicator/OfflineIndicator";
import MediaContextMenu from "@/components/MediaContextMenu/MediaContextMenu";

export default function QuickSelectionsSong({
    song,
    songs,
}: {
    song: BaseSongWithAlbumResponse;
    songs: BaseSongWithAlbumResponse[];
}): JSX.Element {
    const $song = useMedia(song);
    const $vocabulary = useStore(rockIt.vocabularyManager.vocabularyAtom);

    const handleClick = useCallback((): void => {
        // Set the queue with all songs
        const playableSongs = songs.filter(isSongWithAlbum);
        if (playableSongs.length > 0) {
            rockIt.queueManager.setMedia(playableSongs, "");
            rockIt.queueManager.moveToMedia($song.publicId);
            rockIt.mediaPlayerManager.play();
        }
    }, [$song.publicId, songs]);

    return (
        <MediaContextMenu media={$song} location={EMediaContextLocation.HOME}>
            <div
                className="flex h-fit cursor-pointer items-center gap-2 rounded-lg p-2 transition hover:bg-zinc-800"
                onClick={handleClick}
            >
                <Image
                    width={100}
                    height={100}
                    className="aspect-square h-12 min-h-12 w-12 min-w-12 rounded-sm object-cover"
                    src={$song.imageUrl}
                    alt={$vocabulary.COVER_OF.replace("{name}", $song.name)}
                />
                <div className="flex w-full min-w-0 flex-col justify-center">
                    <div className="flex items-center gap-1.5">
                        <span className="w-full min-w-0 truncate text-sm font-semibold text-white">
                            {$song.name}
                        </span>
                        <OfflineIndicator
                            publicId={$song.publicId}
                            className="h-5 w-5"
                        />
                    </div>
                    <span className="w-full min-w-0 truncate text-xs text-gray-400">
                        {$song.artists[0]?.name ?? $vocabulary.UNKNOWN} {" • "}{" "}
                        {$song.album?.name ?? "—"}
                    </span>
                </div>
            </div>
        </MediaContextMenu>
    );
}
