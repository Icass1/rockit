"use client";

import { useCallback, type JSX } from "react";
import Image from "next/image";
import { BaseArtistResponse } from "@/dto";
import { Play } from "lucide-react";
import { getAllPlayableMedia, isQueueable, TMedia } from "@/models/types/media";
import { rockIt } from "@/lib/rockit/rockIt";
import Artists from "@/components/Artists/Artists";
import ListOptionsMenu from "@/components/RenderList/ListOptionsMenu";
import { Media } from "@/components/RenderList/Media";

export default function RenderList({
    title,
    artists,
    image,
    media,
    showMediaIndex,
    showMediaImage,
    listPublicId,
    expandedByMediaId,
}: {
    title: string;
    artists: BaseArtistResponse[];
    image: string;
    media: TMedia[];
    showMediaIndex: boolean;
    showMediaImage: boolean;
    listPublicId?: string;
    expandedByMediaId?: Record<string, boolean>;
}): JSX.Element {
    const playableMedia = getAllPlayableMedia(media);

    const handlePlay = useCallback((): void => {
        if (!listPublicId || !playableMedia.length) return;

        rockIt.queueManager.setMedia(
            playableMedia.filter(isQueueable),
            listPublicId
        );
        rockIt.queueManager.setQueueMediaId();
        rockIt.mediaPlayerManager.play();
    }, [playableMedia, listPublicId]);

    return (
        <div className="grid h-full w-full grid-cols-[1fr_3fr] gap-4">
            <div className="z-1 h-full w-full max-w-full min-w-0">
                <div className="relative h-full w-full">
                    <div className="relative top-1/2 left-1/2 flex h-fit w-fit -translate-x-1/2 -translate-y-1/2 flex-col p-1">
                        {/* Blurred glow layer */}
                        <div className="group relative">
                            <Image
                                src={image}
                                alt=""
                                aria-hidden="true"
                                width={600}
                                height={600}
                                className="absolute inset-0 -z-10 scale-105 rounded-lg opacity-70 blur-3xl saturate-150"
                            />
                            {/* Main image */}
                            <Image
                                src={image}
                                alt={title}
                                width={600}
                                height={600}
                                className="relative rounded-lg"
                                // placeholder={imageBlur ? "blur" : "empty"}
                                // blurDataURL={imageBlur}
                            />
                            {/* Play button overlay */}
                            <button
                                type="button"
                                onClick={handlePlay}
                                className="absolute right-2 bottom-2 flex h-12 w-12 cursor-pointer items-center justify-center rounded-full bg-linear-45 from-[#ee1086] to-[#fb6467] text-white opacity-0 shadow-lg transition-all group-hover:opacity-100 hover:scale-105"
                                aria-label="Play"
                            >
                                <Play className="ml-0.5 h-6 w-6" fill="white" />
                            </button>
                        </div>
                        <div className="flex items-center justify-center gap-2 px-2">
                            <span className="text-center text-2xl font-bold">
                                {title}
                            </span>
                            <ListOptionsMenu
                                media={media}
                                listPublicId={listPublicId}
                                title={title}
                            />
                        </div>
                        <Artists
                            artists={artists}
                            className="font-semibold"
                        ></Artists>
                    </div>
                </div>
            </div>
            <div className="z-1 flex h-full w-full max-w-full min-w-0 flex-col gap-4 overflow-y-auto pr-1 pb-96">
                {media.map(
                    (m, index): JSX.Element => (
                        <Media
                            key={m.publicId}
                            index={index}
                            media={m}
                            allMedia={media}
                            substractArtists={artists.map(
                                (artist): string => artist.name
                            )}
                            showMediaImage={showMediaImage}
                            showMediaIndex={showMediaIndex}
                            listPublicId={listPublicId}
                            expandedByMediaId={expandedByMediaId}
                        />
                    )
                )}
            </div>
        </div>
    );
}
