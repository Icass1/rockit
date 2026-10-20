"use client";

import { useCallback, useRef, type JSX } from "react";
import { useStore } from "@nanostores/react";
import useWindowSize from "@/hooks/useWindowSize";
import { rockIt } from "@/lib/rockit/rockIt";

interface PlayerCoverArtProps {
    uri: string | undefined;
    mediaType: string | undefined;
}

function aspectClass(mediaType: string | undefined): string {
    if (mediaType === "video") return "aspect-video rounded-xl";
    if (mediaType === "radio") return "aspect-square rounded-full";
    return "aspect-square rounded-2xl";
}

export default function PlayerCoverArt({
    uri,
    mediaType,
}: PlayerCoverArtProps): JSX.Element {
    const audioOnly = useStore(rockIt.mediaPlayerManager.audioOnlyAtom);
    const { width, height } = useWindowSize();
    const videoContainerRef = useRef<HTMLDivElement>(null);
    const isDesktop =
        width !== undefined &&
        height !== undefined &&
        width >= 768 &&
        height >= 500;
    const showVideo = mediaType === "video" && !audioOnly && !isDesktop;

    const attachVideoRef = useCallback(
        (container: HTMLDivElement | null): void => {
            const previous = videoContainerRef.current;
            if (previous) {
                rockIt.mediaPlayerManager.detachVideoFromContainer(previous);
            }
            videoContainerRef.current = container;
            if (container && showVideo) {
                rockIt.mediaPlayerManager.attachVideoToContainer(container);
            }
        },
        [showVideo]
    );

    return (
        <div
            className={`relative mx-auto w-full max-w-85 overflow-hidden bg-(--color-surface) shadow-xl ${aspectClass(mediaType)}`}
        >
            {showVideo ? (
                <div ref={attachVideoRef} className="absolute inset-0" />
            ) : uri ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                    src={uri}
                    alt=""
                    className="h-full w-full object-cover"
                    loading="eager"
                />
            ) : (
                <div className="h-full w-full bg-(--color-surface)" />
            )}
        </div>
    );
}
