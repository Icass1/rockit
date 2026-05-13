"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useStore } from "@nanostores/react";
import {
    getMediaArtists,
    getMediaSubtitle,
    TPlayableMedia,
} from "@rockit/shared";
import { Pause, Play } from "lucide-react";
import { rockIt } from "@/lib/rockit/rockIt";
import Artists from "@/components/Artists/Artists";

export function PlayerUICoverColumn({
    currentMedia,
}: {
    currentMedia: TPlayableMedia;
}) {
    const $playing = useStore(rockIt.mediaPlayerManager.playingAtom);
    const [showIcon, setShowIcon] = useState(false);
    const videoContainerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!showIcon) return;
        const t = setTimeout(() => setShowIcon(false), 800);
        return () => clearTimeout(t);
    }, [showIcon]);

    useEffect(() => {
        if (videoContainerRef.current && currentMedia.type === "video") {
            rockIt.mediaPlayerManager.attachVideoToContainer(
                videoContainerRef.current
            );
        }
    }, [currentMedia]);

    const iconClassName =
        "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 z-20 transition-all z-20 p-5 duration-500" +
        (showIcon ? " opacity-100" : " opacity-0");

    const isVideo = currentMedia.type === "video";

    return (
        <div className="z-10 flex h-full w-full flex-col items-center justify-center">
            {/* Cover or Video */}
            {isVideo ? (
                <div
                    ref={videoContainerRef}
                    className="relative aspect-video w-full max-w-[70%] overflow-hidden rounded-lg"
                />
            ) : (
                <div
                    className="relative aspect-square w-full max-w-[70%] overflow-hidden rounded-lg"
                    onClick={() => {
                        setShowIcon(true);
                        rockIt.mediaPlayerManager.togglePlayPauseOrSetMedia();
                    }}
                >
                    <Image
                        src={currentMedia.imageUrl}
                        height={600}
                        width={600}
                        alt="Media Cover"
                        className="absolute h-full w-full rounded-xl select-none"
                    />
                    <div
                        className={`h-20 w-20 rounded-full bg-[#1a1a1a]/60 ${iconClassName}`}
                    >
                        {$playing ? (
                            <Pause className={iconClassName} fill="white" />
                        ) : (
                            <Play className={iconClassName} fill="white" />
                        )}
                    </div>
                </div>
            )}

            {currentMedia && (
                <>
                    {/* Media info */}
                    <div className="flex w-full flex-col items-center justify-center px-2 text-center">
                        <h1 className="line-clamp-2 text-4xl leading-normal font-bold text-balance">
                            {currentMedia.name}
                        </h1>
                        <p className="mt-2 flex w-full items-center justify-center gap-1 text-xl font-medium text-gray-400">
                            <span className="max-w-[75%] truncate text-center md:hover:underline">
                                {getMediaSubtitle(currentMedia)}
                            </span>
                            <span>•</span>
                            <Artists artists={getMediaArtists(currentMedia)} />
                        </p>
                    </div>
                </>
            )}
        </div>
    );
}
