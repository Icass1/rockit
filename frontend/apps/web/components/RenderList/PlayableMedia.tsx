import { useCallback, type JSX } from "react";
import Image from "next/image";
import { BaseArtistResponse } from "@/dto";
import { useStore } from "@nanostores/react";
import {
    getAllPlayableMedia,
    getMediaDuration,
    isDownloadable,
    isPlayable,
    isQueueable,
    isSong,
    isVideo,
    TMedia,
    TPlayableMedia,
} from "@rockit/packages/shared/models/types/media";
import { EMediaContextLocation } from "@rockit/shared";
import useMedia from "@/hooks/useMedia";
import { rockIt } from "@/lib/rockit/rockIt";
import { getTime } from "@/lib/utils/getTime";
import Artists from "@/components/Artists/Artists";
import { DownloadStatusIcon } from "@/components/DownloadStatusIcon/DownloadStatusIcon";
import LikeButton from "@/components/LikeButton/LikeButton";
import MediaContextMenu from "@/components/MediaContextMenu/MediaContextMenu";
import ProviderTag from "@/components/ProviderTag/ProviderTag";

function getArtistNames(
    media: TPlayableMedia,
    substractArtists: string[]
): BaseArtistResponse[] {
    if (isSong(media) || isVideo(media)) {
        return media.artists.filter(
            (artist): boolean => !substractArtists.includes(artist.name)
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
}): JSX.Element {
    const $media = useMedia(_media);
    const $vocabulary = useStore(rockIt.vocabularyManager.vocabularyAtom);

    const artists = getArtistNames($media, substractArtists);

    const handleClick = useCallback((): void => {
        if (isDownloadable($media) && $media.downloaded !== true) {
            rockIt.downloaderManager.downloadMediaAsync(
                [$media.publicId],
                $media.name
            );
        } else if (allMedia && allMedia.length > 0 && listPublicId) {
            const tempAllMedia = getAllPlayableMedia(allMedia);

            // Replace this media in allMedia in case it has been downloaded
            for (let i = 0; i < tempAllMedia.length; i++) {
                if (tempAllMedia[i].publicId == $media.publicId) {
                    tempAllMedia[i] = $media;
                }
            }

            const playableMedia = tempAllMedia.filter(isPlayable);

            rockIt.queueManager.setMedia(
                playableMedia.filter(isQueueable),
                listPublicId
            );
            rockIt.queueManager.moveToMedia($media.publicId);
            rockIt.mediaPlayerManager.play();
        }
    }, [$media, allMedia, listPublicId]);

    const downloaded = !isDownloadable($media) || $media.downloaded === true;

    return (
        <MediaContextMenu
            media={$media}
            location={EMediaContextLocation.PLAYLIST}
        >
            <div
                className="group flex cursor-pointer flex-row items-center gap-3 pr-3"
                onClick={handleClick}
            >
                {showMediaIndex && (
                    <p className="h-fit w-6 text-right text-gray-400">
                        {index + 1}
                    </p>
                )}
                {showMediaImage && (
                    <Image
                        className="h-12 w-auto rounded"
                        src={$media.imageUrl}
                        alt={$media.name}
                        width={50}
                        height={50}
                    />
                )}
                <div className={`relative flex w-full flex-col`}>
                    <div className="flex items-center gap-1.5">
                        <DownloadStatusIcon publicId={$media.publicId} />
                        <p
                            className={`text-md font-semibold ${!downloaded && "text-neutral-400 transition-colors duration-300 group-hover:text-transparent"}`}
                        >
                            {$media.name}
                        </p>
                    </div>
                    <div className="flex flex-row items-center gap-1">
                        <ProviderTag
                            name={$media.provider}
                            className={`${!downloaded && "opacity-65"}`}
                        />
                        {artists.length > 0 && (
                            <div className="w-fit">
                                <Artists
                                    artists={artists}
                                    className={`${!downloaded && "text-neutral-400 transition-colors duration-300 group-hover:text-transparent"}`}
                                />
                            </div>
                        )}
                    </div>
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
