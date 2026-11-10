"use client";

import { useCallback, type JSX, type ReactNode } from "react";
import Image from "next/image";
import { BaseArtistResponse } from "@/dto";
import { EMediaContextLocation } from "@rockit/shared";
import type { CollectionPager } from "@rockit/shared";
import { MoreHorizontal, Play } from "lucide-react";
import {
    getAllPlayableMedia,
    getTotalDuration,
    TListMedia,
    TMedia,
} from "@/models/types/media";
import { rockIt } from "@/lib/rockit/rockIt";
import Artists from "@/components/Artists/Artists";
import DurationToggle from "@/components/DurationToggle";
import MediaContextMenu from "@/components/MediaContextMenu/MediaContextMenu";
import { useVocabulary } from "@/components/providers/VocabularyProvider";
import VirtualCollectionList from "@/components/RenderList/VirtualCollectionList";

export default function RenderList({
    title,
    artists,
    image,
    media,
    listMedia,
    showMediaIndex,
    showMediaImage,
    listPublicId,
    coverOverlay,
    pager,
    total,
}: {
    title: string;
    artists: BaseArtistResponse[];
    image: string;
    media: TMedia[];
    listMedia: TListMedia;
    showMediaIndex: boolean;
    showMediaImage: boolean;
    listPublicId?: string;
    expandedByMediaId?: Record<string, boolean>;
    coverOverlay?: ReactNode;
    pager: CollectionPager;
    total?: number;
    offset?: number;
}): JSX.Element {
    const playableMedia = getAllPlayableMedia(media);

    const $vocabulary = useVocabulary();

    const handlePlay = useCallback((): void => {
        if (listPublicId) void rockIt.queueManager.playCollection(listPublicId);
    }, [listPublicId]);

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
                            className="from-primary to-brand-light text-foreground-strong absolute right-2 bottom-2 flex h-12 w-12 cursor-pointer items-center justify-center rounded-full bg-linear-45 opacity-0 shadow-lg transition-all group-hover:opacity-100 hover:scale-105"
                            aria-label={$vocabulary.PLAY}
                        >
                            <Play className="fill-on-media ml-0.5 h-6 w-6" />
                        </button>
                    </div>
                    <div className="relative w-full px-2">
                        <h1 className="pt-2 pr-2 text-center text-2xl font-bold text-balance">
                            {title}
                        </h1>
                        <div className="absolute top-1/2 right-0 -translate-y-1/2">
                            <MediaContextMenu
                                media={listMedia}
                                location={EMediaContextLocation.PLAYLIST}
                                openOnLeftClick
                            >
                                <button
                                    type="button"
                                    aria-label={$vocabulary.MORE_OPTIONS}
                                    className="text-muted-foreground hover:bg-muted hover:text-foreground-strong flex h-9 w-9 cursor-pointer items-center justify-center rounded-full transition-colors"
                                >
                                    <MoreHorizontal className="h-5 w-5" />
                                </button>
                            </MediaContextMenu>
                        </div>
                    </div>
                    <Artists
                        artists={artists}
                        className="text-muted-foreground text-lg font-semibold text-balance"
                    />
                    <p className="text-muted-foreground flex items-center justify-center gap-2 text-center font-semibold text-balance">
                        <span>
                            {total ?? playableMedia.length}{" "}
                            {playableMedia.length === 1 ? "song" : "songs"}
                        </span>
                        <DurationToggle durationMs={getTotalDuration(media)} />
                    </p>
                </div>
            </div>
            <div className="scroll-on-hover z-1 md:overflow-y-auto md:pr-4">
                <div className="flex flex-col gap-2 py-4 md:py-16">
                    <VirtualCollectionList
                        pager={pager}
                        showMediaIndex={showMediaIndex}
                        showMediaImage={showMediaImage}
                        substractArtists={artists.map((artist) => artist.name)}
                    />
                    {media.length === 0 && (
                        <p className="text-muted-foreground text-center text-lg font-semibold text-balance">
                            {$vocabulary.NO_MEDIA_FOUND}
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
}
