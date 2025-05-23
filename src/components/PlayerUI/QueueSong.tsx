"use client";

import type { SongDB } from "@/lib/db/song";
import { getImageUrl } from "@/lib/getImageUrl";
import { getTime } from "@/lib/getTime";
import {
    currentSong,
    pause,
    play,
    playing,
    playWhenReady,
    queue,
    queueIndex,
    type QueueElement,
} from "@/stores/audio";
import { useStore } from "@nanostores/react";
import { Pause, Play } from "lucide-react";
import React from "react";
import Image from "@/components/Image";

export function QueueSong({ song }: { song: QueueElement }) {
    const $queueIndex = useStore(queueIndex);

    const $playing = useStore(playing);

    const handleClick = async () => {
        if (song.index == queueIndex.get() && playing.get()) {
            pause();
            return;
        }
        if (song.index == queueIndex.get() && !playing.get()) {
            play();
            return;
        }

        const tempQueue = queue.get();
        if (!tempQueue) return;

        const currentSongIndexInQueue = tempQueue.findIndex(
            (_song) => _song.index == song.index
        );

        queueIndex.set(tempQueue[currentSongIndexInQueue].index);

        const newSongId = tempQueue.find(
            (song) => song.index == queueIndex.get()
        )?.song.id;
        if (!newSongId) {
            return;
        }

        await fetch(`/api/song/${newSongId}`)
            .then((response) => response.json())
            .then((data: SongDB) => {
                playWhenReady.set(true);
                currentSong.set(data);
            });
    };

    return (
        <li
            // onClick={handleClick}
            onClick={handleClick}
            className={`group flex items-center gap-x-2 p-2 ${
                song.index === $queueIndex
                    ? "bg-[rgba(50,50,50,0.75)]"
                    : "md:hover:bg-[rgba(75,75,75,0.75)]"
            }`}
        >
            {/* Cover */}
            <div className="relative">
                {/* Imagen de portada */}
                <Image
                    src={getImageUrl({
                        imageId: song.song.image,
                        width: 48,
                        height: 48,
                        placeHolder: "/api/image/song-placeholder.png",
                    })}
                    alt={song.song.name}
                    className={`h-12 w-12 rounded object-cover ${
                        song.index === $queueIndex ? "brightness-50" : ""
                    }`}
                />
                {/* Ícono Play */}
                {song.index === $queueIndex && $playing && (
                    <div className="absolute inset-0 flex items-center justify-center">
                        <Pause className="h-5 w-5 fill-current text-white" />
                    </div>
                )}
                {song.index === $queueIndex && !$playing && (
                    <div className="absolute inset-0 flex items-center justify-center">
                        <Play className="h-5 w-5 fill-current text-white" />
                    </div>
                )}
            </div>
            {/* Song Info */}
            <div className="max-w-full min-w-0 flex-1">
                <p className="truncate text-base font-semibold text-white">
                    <label className="text-xs text-yellow-400">
                        {song.index} -{" "}
                    </label>
                    {song.song.name}
                </p>
                <p className="truncate text-sm text-gray-300">
                    {song.song.artists.map((artist) => artist.name).join(", ")}
                </p>
            </div>
            {/* Duration */}
            <p className="px-2 text-sm text-gray-300">
                {getTime(song.song.duration)}
            </p>
        </li>
    );
}
