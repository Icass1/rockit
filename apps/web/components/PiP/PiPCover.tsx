"use client";

import { useEffect, useRef, type JSX } from "react";
import Image from "next/image";
import { useStore } from "@nanostores/react";
import { rockIt } from "@/lib/rockit/rockIt";
import { PiPControls } from "@/components/PiP/PiPControls";
import { PiPProgress } from "@/components/PiP/PiPProgress";
import type { PiPLayout } from "@/components/PiP/PiPRoot";

interface PiPCoverProps {
    showControls: boolean;
    layout: PiPLayout;
    minimalOverlay?: boolean;
    showLyrics?: boolean;
    onToggleLyrics?: () => void;
}

export function PiPCover({
    showControls,
    layout,
    minimalOverlay = false,
    showLyrics = false,
    onToggleLyrics,
}: PiPCoverProps): JSX.Element {
    const videoRef = useRef<HTMLVideoElement>(null);
    const $currentSong = useStore(rockIt.queueManager.currentMediaAtom);
    const $playing = useStore(rockIt.mediaPlayerManager.playingAtom);
    const $currentTime = useStore(rockIt.mediaPlayerManager.currentTimeAtom);

    const isVideoType = $currentSong?.type === "video";
    const mediaUrl = isVideoType
        ? ((($currentSong as Record<string, unknown>)?.videoSrc as string) ??
          "")
        : ($currentSong?.imageUrl ?? "");
    const mediaTitle = $currentSong?.name ?? "";

    const intrinsicRatio = isVideoType ? 16 / 9 : 1;

    const isCompact = minimalOverlay;
    const showProgress = showControls && !isCompact;

    useEffect(() => {
        const video = videoRef.current;
        if (!video || !isVideoType) return;

        if ($playing) {
            const playPromise = video.play();
            if (playPromise !== undefined) {
                playPromise.catch(() => {
                    /* autoplay blocked — wait for user interaction */
                });
            }
        } else {
            video.pause();
        }
    }, [$playing, isVideoType]);

    useEffect(() => {
        const video = videoRef.current;
        if (!video || !isVideoType) return;

        if (Math.abs(video.currentTime - $currentTime) > 1) {
            video.currentTime = $currentTime;
        }
    }, [$currentTime, isVideoType]);

    return (
        <div
            className="pip-cover"
            style={
                {
                    "--cover-aspect": String(intrinsicRatio),
                } as React.CSSProperties
            }
        >
            {isVideoType ? (
                <video
                    ref={videoRef}
                    src={mediaUrl}
                    playsInline
                    autoPlay
                    muted
                    style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "contain",
                    }}
                    data-testid="pip-video"
                />
            ) : (
                <Image
                    src={mediaUrl}
                    alt={"Cover of " + mediaTitle}
                    fill
                    style={{
                        objectFit: "contain",
                    }}
                    draggable={false}
                    data-testid="pip-image"
                />
            )}

            <div
                className={`pip-overlay ${showControls ? "pip-overlay--visible" : ""} ${
                    isCompact ? "pip-overlay--bottom" : "pip-overlay--center"
                }`}
                data-testid="pip-overlay"
            >
                <PiPControls
                    show={showControls}
                    layout={layout}
                    showLyrics={showLyrics}
                    onToggleLyrics={onToggleLyrics}
                    isSong={$currentSong?.type === "song"}
                />
                {showProgress && (
                    <PiPProgress show={showProgress} layout={layout} />
                )}
            </div>
        </div>
    );
}

export default PiPCover;
