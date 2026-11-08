"use client";

import { useEffect, useRef, useState, type JSX } from "react";
import Image from "next/image";
import { useStore } from "@nanostores/react";
import { getMediaVideoUrl } from "@rockit/shared";
import { useReducedMotion } from "framer-motion";
import { rockIt } from "@/lib/rockit/rockIt";
import { PiPArtworkTransition } from "@/components/PiP/PiPArtworkTransition";
import VinylRecord from "@/components/PlayerUI/VinylRecord";
import { useVocabulary } from "@/components/providers/VocabularyProvider";

function PiPVideo({
    videoUrl,
    cover,
    playing,
}: {
    videoUrl: string;
    cover: string;
    playing: boolean;
}): JSX.Element {
    const videoRef = useRef<HTMLVideoElement>(null);
    const currentTime = useStore(rockIt.mediaPlayerManager.currentTimeAtom);
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
        <video
            ref={videoRef}
            key={videoUrl}
            src={videoUrl}
            poster={cover}
            playsInline
            muted
            onLoadedMetadata={(event): void => {
                event.currentTarget.currentTime = Number.isFinite(currentTime)
                    ? (currentTime ?? 0)
                    : 0;
            }}
            data-testid="pip-video"
        />
    );
}

export function PiPCover(): JSX.Element {
    const vocabulary = useVocabulary();
    const media = useStore(rockIt.queueManager.currentMediaAtom);
    const playing = useStore(rockIt.mediaPlayerManager.playingAtom);
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

    return (
        <button
            type="button"
            className="pip-cover"
            aria-label={playing ? vocabulary.PAUSE : vocabulary.PLAY}
            aria-pressed={playing}
            onClick={() => rockIt.mediaPlayerManager.togglePlayPause()}
        >
            {videoUrl ? (
                <PiPVideo videoUrl={videoUrl} cover={cover} playing={playing} />
            ) : vinylMode && media?.type === "song" ? (
                <div className="pip-vinyl" data-testid="pip-vinyl">
                    <PiPArtworkTransition
                        media={media}
                        cover={cover}
                        reducedMotion={!!reducedMotion}
                        direction={rockIt.queueManager.lastNavigationDirection}
                    >
                        {(snapshot, image) =>
                            snapshot.type === "song" ? (
                                <VinylRecord
                                    imageUrl={image}
                                    name={snapshot.name}
                                    artists={snapshot.artists}
                                    isPlaying={playing && !reducedMotion}
                                    eager
                                />
                            ) : null
                        }
                    </PiPArtworkTransition>
                </div>
            ) : (
                <Image
                    src={cover}
                    loading="eager"
                    alt={media?.name ?? vocabulary.SONG}
                    width={1200}
                    height={1200}
                    draggable={false}
                    onError={(): void => setFailedImage(imageUrl)}
                    data-testid="pip-image"
                />
            )}
        </button>
    );
}

export default PiPCover;
