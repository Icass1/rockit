"use client";

import { useEffect, useRef, useState, type JSX } from "react";
import Image from "next/image";
import { useStore } from "@nanostores/react";
import { getMediaVideoUrl } from "@rockit/shared";
import { useReducedMotion } from "framer-motion";
import { rockIt } from "@/lib/rockit/rockIt";
import VinylRecord from "@/components/PlayerUI/VinylRecord";
import VinylTransition from "@/components/PlayerUI/VinylTransition";

export function PiPCover(): JSX.Element {
    const videoRef = useRef<HTMLVideoElement>(null);
    const media = useStore(rockIt.queueManager.currentMediaAtom);
    const playing = useStore(rockIt.mediaPlayerManager.playingAtom);
    const currentTime = useStore(rockIt.mediaPlayerManager.currentTimeAtom);
    const vinylMode = useStore(rockIt.playerUIManager.vinylModeAtom);
    const reducedMotion = useReducedMotion();
    const [failedImage, setFailedImage] = useState<string | null>(null);
    const videoUrl =
        media?.type === "video" ? getMediaVideoUrl(media) : undefined;
    const fallback =
        media?.type === "station"
            ? "/radio-placeholder.png"
            : "/song-placeholder.png";
    const imageUrl = media?.imageUrl || fallback;
    const cover = imageUrl === failedImage ? fallback : imageUrl;

    useEffect((): void => {
        rockIt.playerUIManager.initializeArtworkMode();
    }, []);

    useEffect((): void => {
        const video = videoRef.current;
        if (!video || !videoUrl) return;
        if (playing)
            void video.play().catch((): void => {
                /* The audio player retains playback ownership. */
            });
        else video.pause();
    }, [playing, videoUrl]);

    useEffect((): void => {
        const video = videoRef.current;
        if (!video || video.readyState < 1 || !Number.isFinite(currentTime))
            return;
        if (Math.abs(video.currentTime - (currentTime ?? 0)) > 0.5)
            video.currentTime = currentTime ?? 0;
    }, [currentTime, videoUrl]);

    return (
        <div className="pip-cover">
            {videoUrl ? (
                <video
                    ref={videoRef}
                    key={videoUrl}
                    src={videoUrl}
                    poster={cover}
                    playsInline
                    muted
                    onLoadedMetadata={(event): void => {
                        event.currentTarget.currentTime = Number.isFinite(
                            currentTime
                        )
                            ? (currentTime ?? 0)
                            : 0;
                    }}
                    data-testid="pip-video"
                />
            ) : vinylMode && media?.type === "song" ? (
                <div className="pip-vinyl" data-testid="pip-vinyl">
                    <VinylTransition
                        media={media}
                        direction={rockIt.queueManager.lastNavigationDirection}
                    >
                        <VinylRecord
                            imageUrl={cover}
                            name={media.name}
                            artists={media.artists}
                            isPlaying={playing && !reducedMotion}
                        />
                    </VinylTransition>
                </div>
            ) : (
                <Image
                    src={cover}
                    alt={media?.name ?? "Cover"}
                    width={1200}
                    height={1200}
                    draggable={false}
                    onError={(): void => setFailedImage(imageUrl)}
                    data-testid="pip-image"
                />
            )}
        </div>
    );
}

export default PiPCover;
