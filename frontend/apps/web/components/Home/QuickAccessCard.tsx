"use client";

import Image from "next/image";
import { useStore } from "@nanostores/react";
import type { JSX } from "react";
import type { BaseSongWithAlbumResponse } from "@/dto";
import { isSongWithAlbum } from "@/models/types/media";
import { rockIt } from "@/lib/rockit/rockIt";
import { useDominantColor } from "@/components/Home/hooks/useDominantColor";
import PlayButton from "@/components/Home/PlayButton";

interface QuickAccessCardProps {
    eyebrow: string;
    title: string;
    subtitle: string;
    song: BaseSongWithAlbumResponse;
    queue: BaseSongWithAlbumResponse[];
}

export default function QuickAccessCard({
    eyebrow,
    title,
    subtitle,
    song,
    queue,
}: QuickAccessCardProps): JSX.Element {
    const $currentMedia = useStore(rockIt.queueManager.currentMediaAtom);
    const $playing = useStore(rockIt.mediaPlayerManager.playingAtom);

    const isThisPlaying =
        $currentMedia?.publicId === song.publicId && $playing;
    const { hex, isLoading } = useDominantColor(song.imageUrl);

    function handlePlay(e: React.MouseEvent): void {
        e.stopPropagation();
        const playableSongs = queue.filter(isSongWithAlbum);
        if (playableSongs.length > 0) {
            rockIt.queueManager.setMedia(playableSongs, "home");
            rockIt.queueManager.moveToMedia(song.publicId);
            rockIt.mediaPlayerManager.play();
        }
    };

    return (
        <div
            className="group relative flex h-full min-h-56 w-full cursor-pointer overflow-hidden rounded-2xl transition-transform duration-300 hover:scale-[1.02]"
            onClick={handlePlay}
        >
            <div
                className="absolute inset-0 transition-colors duration-700"
                style={{
                    background: `linear-gradient(135deg, ${hex}55 0%, #00000090 75%)`,
                    opacity: isLoading ? 0 : 1,
                }}
                aria-hidden="true"
            />
            <div className="absolute inset-0 bg-zinc-900" style={{ zIndex: -1 }} />

            <Image
                src={song.imageUrl}
                alt=""
                fill
                sizes="(max-width: 768px) 90vw, 33vw"
                className="object-cover opacity-30 blur-md transition-opacity duration-500 group-hover:opacity-40"
                aria-hidden="true"
            />

            <div className="relative z-10 flex w-full flex-col justify-between p-5">
                <div>
                    <span className="text-xs font-semibold uppercase tracking-wide text-white/70">
                        {eyebrow}
                    </span>
                    <h3 className="mt-2 line-clamp-2 text-2xl font-bold text-white">
                        {title}
                    </h3>
                    <p className="mt-1 truncate text-sm text-white/70">
                        {subtitle}
                    </p>
                </div>

                <div className="mt-6 flex items-center justify-between">
                    <Image
                        src={song.imageUrl}
                        alt={`Cover of ${song.name}`}
                        width={56}
                        height={56}
                        className="rounded-lg object-cover shadow-md"
                    />
                    <PlayButton
                        isPlaying={isThisPlaying}
                        onClick={handlePlay}
                        label={
                            isThisPlaying
                                ? `Pausar ${song.name}`
                                : `Reproducir ${song.name}`
                        }
                    />
                </div>
            </div>
        </div>
    );
}
