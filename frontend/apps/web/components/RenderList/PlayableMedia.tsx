import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { BaseArtistResponse } from "@/dto";
import { useStore } from "@nanostores/react";
import { EEvent, IMediaDownloadStatus } from "@rockit/packages/shared";
import {
    getMediaDuration,
    isDownloadable,
    isPlayable,
    isSong,
    isVideo,
    TMedia,
    TPlayableMedia,
} from "@/models/types/media";
import useMedia from "@/hooks/useMedia";
import { rockIt } from "@/lib/rockit/rockIt";
import { getTime } from "@/lib/utils/getTime";
import Artists from "@/components/Artists/Artists";
import LikeButton from "@/components/LikeButton/LikeButton";
import MediaContextMenu from "@/components/MediaContextMenu/MediaContextMenu";

function getArtistNames(
    media: TPlayableMedia,
    substractArtists: string[]
): BaseArtistResponse[] {
    if (isSong(media) || isVideo(media)) {
        return media.artists.filter(
            (artist) => !substractArtists.includes(artist.name)
        );
    }
    return [];
}

export function PlayableMedia({
    index,
    media: _media,
    allMedia,
    substractArtists = [],
    showMediaIndex,
    showMediaImage,
    listPublicId,
}: {
    index: number;
    media: TPlayableMedia;
    allMedia?: TMedia[];
    substractArtists?: string[];
    showMediaIndex: boolean;
    showMediaImage: boolean;
    listPublicId?: string;
}) {
    const $media = useMedia(_media);
    const $vocabulary = useStore(rockIt.vocabularyManager.vocabularyAtom);
    const [downloadProgress, setDownloadProgress] = useState<number | null>(
        null
    );

    useEffect(() => {
        const handler = (event: IMediaDownloadStatus) => {
            if (event.publicId != $media.publicId) return;
            console.log($media.name, event.completed);
            setDownloadProgress(
                event.completed >= 100 ? null : event.completed
            );
        };

        rockIt.eventManager.addEventListener(
            EEvent.MediaDownloadStatus,
            handler
        );

        return () => {
            rockIt.eventManager.removeEventListener(
                EEvent.MediaDownloadStatus,
                handler
            );
        };
    }, [$media.publicId, $media.name]);

    const artists = getArtistNames($media, substractArtists);

    const handleClick = useCallback(() => {
        if (isDownloadable($media) && $media.downloaded !== true) {
            rockIt.downloaderManager.downloadMediaAsync(
                [$media.publicId],
                $media.name
            );
        } else if (allMedia && allMedia.length > 0 && listPublicId) {
            const tempAllMedia = [...allMedia];

            // Replace this media in allMedia in case it has been downloaded
            for (let i = 0; i < tempAllMedia.length; i++) {
                if (tempAllMedia[i].publicId == $media.publicId) {
                    tempAllMedia[i] = $media;
                }
            }

            const playableMedia = tempAllMedia.filter(isPlayable);

            console.log(
                "PlayableMedia.handleClick: playableMedia",
                playableMedia,
                $media.publicId
            );

            rockIt.queueManager.setMedia(playableMedia, "album", listPublicId);
            rockIt.queueManager.moveToMedia($media.publicId);
            rockIt.mediaPlayerManager.play();
        }
    }, [$media, allMedia, listPublicId]);

    const downloaded = !isDownloadable($media) || $media.downloaded === true;

    return (
        <MediaContextMenu media={$media}>
            <div
                className="group flex cursor-pointer flex-row items-center gap-4 pr-3"
                onClick={handleClick}
            >
                {showMediaIndex && (
                    <p className="h-fit w-4 text-right text-gray-400">
                        {index + 1}
                    </p>
                )}
                {showMediaImage && (
                    <Image
                        className="rounded"
                        src={$media.imageUrl}
                        alt={$media.name}
                        width={40}
                        height={40}
                    />
                )}
                <div className={`relative flex w-full flex-col`}>
                    <div className="flex items-center gap-1.5">
                        {downloadProgress !== null && (
                            <svg
                                width="18"
                                height="18"
                                viewBox="0 0 20 20"
                                className="shrink-0"
                            >
                                <circle
                                    cx="10"
                                    cy="10"
                                    r="8"
                                    fill="none"
                                    stroke="#404040"
                                    strokeWidth="2"
                                />
                                <circle
                                    cx="10"
                                    cy="10"
                                    r="8"
                                    fill="none"
                                    stroke="#ee1086"
                                    strokeWidth="2"
                                    strokeDasharray={`${2 * Math.PI * 8}`}
                                    strokeDashoffset={`${2 * Math.PI * 8 * (1 - downloadProgress / 100)}`}
                                    strokeLinecap="round"
                                    transform="rotate(-90 10 10)"
                                />
                                <path
                                    d="M10 6v5M7 9l3 3 3-3"
                                    stroke="#ee1086"
                                    strokeWidth="1.5"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    fill="none"
                                />
                            </svg>
                        )}
                        <p
                            className={`text-md font-semibold ${!downloaded && "text-neutral-400 transition-colors duration-300 group-hover:text-transparent"}`}
                        >
                            {$media.name}
                        </p>
                    </div>
                    {artists.length > 0 && (
                        <div className="w-fit">
                            <Artists
                                artists={artists}
                                className={`${!downloaded && "text-neutral-400 transition-colors duration-300 group-hover:text-transparent"}`}
                            ></Artists>
                        </div>
                    )}
                    {!downloaded && (
                        <p className="absolute top-1/2 left-1/2 hidden -translate-x-1/2 -translate-y-1/2 rounded px-2 py-1 text-sm font-semibold text-white group-hover:block">
                            {$vocabulary.CLICK_TO_DOWNLOAD}
                        </p>
                    )}
                </div>
                <LikeButton mediaPublicId={$media.publicId}></LikeButton>
                <div>{getTime(getMediaDuration($media) ?? 0)}</div>
            </div>
        </MediaContextMenu>
    );
}
