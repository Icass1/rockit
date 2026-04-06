import Image from "next/image";
import { BaseArtistResponse } from "@/dto";
import { useStore } from "@nanostores/react";
import {
    getMediaDuration,
    isDownloadable,
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

    const artists = getArtistNames($media, substractArtists);

    const handleClick = () => {
        if (isDownloadable($media) && $media.downloaded !== true) {
            rockIt.downloaderManager.downloadMediaAsync([$media.publicId]);
        } else if (allMedia && allMedia.length > 0 && listPublicId) {
            const playableMedia = allMedia.filter(
                (m): m is TPlayableMedia =>
                    m.type === "song" || m.type === "video"
            );
            rockIt.queueManager.setMedia(playableMedia, "album", listPublicId);
            rockIt.queueManager.moveToMedia($media.publicId);
            rockIt.mediaPlayerManager.play();
        }
    };

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
                    <p
                        className={`text-md font-semibold ${!downloaded && "text-neutral-400 transition-colors duration-300 group-hover:text-transparent"}`}
                    >
                        {$media.name}
                    </p>
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
