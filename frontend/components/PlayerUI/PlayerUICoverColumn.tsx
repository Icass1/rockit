"use client";

import { rockIt } from "@/lib/rockit/rockIt";
import { RockItSongWithAlbum } from "@/lib/rockit/rockItSongWithAlbum";
import { useStore } from "@nanostores/react";
import { Pause, Play } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

interface PlayerUICoverColumnProps {
    currentSong: RockItSongWithAlbum | undefined;
}

export function PlayerUICoverColumn({ currentSong }: PlayerUICoverColumnProps) {
    const $playing = useStore(rockIt.audioManager.playingAtom);
    const [showIcon, setShowIcon] = useState(false);

    useEffect(() => {
        if (!showIcon) return;
        const t = setTimeout(() => setShowIcon(false), 800);
        return () => clearTimeout(t);
    }, [showIcon]);

    const iconClassName =
        "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 z-20 transition-all z-20 p-5 duration-500" +
        (showIcon ? " opacity-100" : " opacity-0");

    return (
        <div className="z-10 flex h-full w-full flex-col items-center justify-center">
            {/* Cover */}
            <div
                className="relative aspect-square w-full max-w-[70%] overflow-hidden rounded-lg"
                onClick={() => {
                    setShowIcon(true);
                    rockIt.audioManager.togglePlayPauseOrSetSong();
                }}
            >
                <Image
                    src={
                        currentSong?.internalImageUrl ??
                        rockIt.SONG_PLACEHOLDER_IMAGE_URL
                    }
                    height={600}
                    width={600}
                    alt="Song Cover"
                    className="absolute h-full w-full select-none rounded-xl"
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

            {/* Song info */}
            <div className="flex w-full flex-col items-center justify-center px-2 text-center">
                <h1 className="line-clamp-2 text-balance text-4xl font-bold leading-normal">
                    {currentSong?.name}
                </h1>
                <p className="mt-2 flex w-full items-center justify-center gap-1 text-xl font-medium text-gray-400">
                    <span className="max-w-[75%] truncate text-center md:hover:underline">
                        {currentSong?.album.name}
                    </span>
                    <span>•</span>
                    {currentSong?.artists && currentSong.artists.length > 0 ? (
                        <Link
                            href={`/artist/${currentSong.artists[0].publicId}`}
                            className="truncate md:hover:underline"
                        >
                            {currentSong.artists[0].name}
                        </Link>
                    ) : (
                        <span>Artista desconocido</span>
                    )}
                </p>
            </div>
        </div>
    );
}
