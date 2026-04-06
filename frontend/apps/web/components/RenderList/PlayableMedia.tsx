import Image from "next/image";
import { useStore } from "@nanostores/react";
import {
    getMediaDuration,
    isDownloadable,
    PlayableMediaType,
} from "@/types/media";
import useMedia from "@/hooks/useMedia";
import { rockIt } from "@/lib/rockit/rockIt";
import { getTime } from "@/lib/utils/getTime";
import Artists from "@/components/Artists/Artists";
import LikeButton from "@/components/LikeButton/LikeButton";
import MediaContextMenu from "@/components/MediaContextMenu/MediaContextMenu";

export function Media({
    index,
    media: _media,
    substractArtists = [],
    showMediaIndex,
    showMediaImage,
}: {
    index: number;
    media: PlayableMediaType;
    substractArtists?: string[];
    showMediaIndex: boolean;
    showMediaImage: boolean;
}) {
    const $media = useMedia(_media);

    const artists = ($media.artists ?? []).filter(
        (artist) => !substractArtists.includes(artist.name)
    );

    const $vocabulary = useStore(rockIt.vocabularyManager.vocabularyAtom);

    const handleClick = () => {
        if (isDownloadable($media) && !$media.downloaded) {
            rockIt.downloaderManager.downloadMediaAsync([$media.publicId]);
        }
    };

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
                        className={`text-md font-semibold ${!$media.downloaded && "text-neutral-400 transition-colors duration-300 group-hover:text-transparent"}`}
                    >
                        {$media.name}
                    </p>
                    {artists.length > 0 && (
                        <div className="w-fit">
                            <Artists
                                artists={artists}
                                className={`${!$media.downloaded && "text-neutral-400 transition-colors duration-300 group-hover:text-transparent"}`}
                            ></Artists>
                        </div>
                    )}
                    {!$media.downloaded && (
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
