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
        <div className="mx-auto grid h-[calc(100vh-12rem)] w-full max-w-7xl grid-cols-[1fr_2fr] gap-20 px-8">
            <div className="z-1 flex items-center justify-center">
                <div className="flex flex-col gap-1">
                    {/* Blurred glow layer */}
                    <div className="group relative">
                        <Image
                            src={image}
                            alt=""
                            aria-hidden="true"
                            width={600}
                            height={600}
                            className="absolute inset-0 -z-10 scale-150 rounded-lg opacity-80 blur-[100px] saturate-150"
                        />
                        {/* Main image */}
                        <Image
                            src={image}
                            alt={title}
                            width={600}
                            height={600}
                            className="relative rounded-lg"
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
                    <div className="relative w-full px-2">
                        <h1 className="pt-2 pr-2 text-center text-2xl font-bold text-balance">
                            {title}
                        </h1>
                        <div className="absolute top-1/2 right-0 -translate-y-1/2">
                            <ListOptionsMenu
                                media={media}
                                listPublicId={listPublicId}
                                title={title}
                            />
                        </div>
                    </div>
                    <Artists
                        artists={artists}
                        className="text-lg font-semibold text-balance text-neutral-400"
                    />
                    <p className="text-center font-semibold text-balance text-neutral-400">
                        {playableMedia.length} {playableMedia.length === 1 ? "song" : "songs"}
                    </p>
                </div>
            </div>
            <div className="scroll-on-hover z-1 overflow-y-auto pr-4">
                <div className="flex flex-col gap-2 py-16">
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
        </div>
    );
}
