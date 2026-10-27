"use client";

import { useCallback, type JSX } from "react";
import Image from "next/image";
import { BaseSongWithAlbumResponse } from "@/dto";
import { useStore } from "@nanostores/react";
import { EMediaContextLocation } from "@rockit/shared";
import { Download } from "lucide-react";
import useMedia from "@/hooks/useMedia";
import { rockIt } from "@/lib/rockit/rockIt";
import MediaContextMenu from "@/components/MediaContextMenu/MediaContextMenu";
import { OfflineIndicator } from "@/components/OfflineIndicator/OfflineIndicator";

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
        void rockIt.queueManager.playRecommendedSongAsync($song, songs);
    }, [$song, songs]);

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
                        {!$song.downloaded && (
                            <Download
                                className="h-4 w-4 shrink-0 text-(--color-rockit-pink)"
                                aria-label={$vocabulary.CLICK_TO_DOWNLOAD}
                            />
                        )}
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
