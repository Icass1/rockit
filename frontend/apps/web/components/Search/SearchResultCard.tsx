"use client";

import { useRef, type JSX, type ReactNode } from "react";
import { useStore } from "@nanostores/react";
import {
    EMediaContextLocation,
    type BaseSearchResultsItem,
} from "@rockit/shared";
import { rockIt } from "@/lib/rockit/rockIt";
import MediaContextMenu from "@/components/MediaContextMenu/MediaContextMenu";
import ProviderTag from "@/components/ProviderTag/ProviderTag";

export default function SearchResultCard({
    media,
    children,
}: {
    media: BaseSearchResultsItem;
    children: ReactNode;
}): JSX.Element {
    useStore(rockIt.searchManager.resultsAtom);
    const sources = rockIt.searchManager.getSources(media);
    const playing = useRef(false);
    const canPlay =
        media.type === "song" && Boolean(media.downloaded && media.publicId);
    const play = async (): Promise<void> => {
        if (!canPlay || playing.current) return;
        if (
            rockIt.queueManager.currentMediaAtom.get()?.publicId ===
            media.publicId
        ) {
            rockIt.mediaPlayerManager.togglePlayPauseOrSetMedia();
            return;
        }
        playing.current = true;
        try {
            await rockIt.searchManager.playDownloadedSong(media);
        } finally {
            playing.current = false;
        }
    };
    return (
        <MediaContextMenu
            media={media}
            sources={sources}
            location={EMediaContextLocation.SEARCH}
            openOnLeftClick={!canPlay}
        >
            <div
                onClick={canPlay ? play : undefined}
                className={
                    media.type === "video"
                        ? "w-64 shrink-0 md:w-80"
                        : "w-36 shrink-0 md:w-48"
                }
            >
                {children}
                <div className="mt-2 flex flex-wrap items-center justify-center gap-2 text-xs text-neutral-300">
                    {sources.map((source) => (
                        <div
                            key={source.providerUrl}
                            role="img"
                            title={source.provider}
                            aria-label={source.provider}
                            className="max-w-full rounded-full bg-neutral-800 px-2 py-1"
                        >
                            <ProviderTag name={source.provider} iconOnly />
                        </div>
                    ))}
                </div>
            </div>
        </MediaContextMenu>
    );
}
