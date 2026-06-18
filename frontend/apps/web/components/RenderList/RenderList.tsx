"use client";

import { useCallback, type JSX, type ReactNode } from "react";
import Image from "next/image";
import { BaseArtistResponse } from "@/dto";
import { useStore } from "@nanostores/react";
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
    coverOverlay,
}: {
    title: string;
    artists: BaseArtistResponse[];
    image: string;
    media: TMedia[];
    showMediaIndex: boolean;
    showMediaImage: boolean;
    listPublicId?: string;
    expandedByMediaId?: Record<string, boolean>;
    coverOverlay?: ReactNode;
}): JSX.Element {
    const playableMedia = getAllPlayableMedia(media);

    const $vocabulary = useStore(rockIt.vocabularyManager.vocabularyAtom);

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
        <div className="mx-auto grid w-full max-w-7xl grid-cols-1 gap-4 px-4 md:h-[calc(100vh-12rem)] md:grid-cols-[1fr_2fr] md:gap-20 md:px-8">
            <div className="z-1 flex items-center justify-center">
                <div className="flex flex-col gap-1">
                    {/* Blurred glow layer */}
                    <div className="group relative w-full max-w-64 md:max-w-none">
                        <Image
                            src={image}
                            alt=""
                            aria-hidden="true"
                            width={600}
                            height={600}
                            className="absolute inset-0 -z-10 scale-150 rounded-lg opacity-80 blur-[100px] saturate-150 select-none"
                        />
                        {/* Main image */}
                        <Image
                            src={image}
                            alt={title}
                            width={600}
                            height={600}
                            className="relative h-auto w-full rounded-lg select-none"
                        />
                        {coverOverlay && (
                            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                                {coverOverlay}
                            </div>
                        )}
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
                        {playableMedia.length}{" "}
                        {playableMedia.length === 1 ? "song" : "songs"}
                    </p>
                </div>
            </div>
            <div className="scroll-on-hover z-1 md:overflow-y-auto md:pr-4">
                <div className="flex flex-col gap-2 py-4 md:py-16">
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
                    {media.length === 0 && (
                        <p className="text-center text-lg font-semibold text-balance text-neutral-400">
                            {$vocabulary.NO_MEDIA_FOUND}
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
}
