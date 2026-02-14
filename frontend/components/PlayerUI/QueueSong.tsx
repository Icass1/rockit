"use client";

import { rockIt } from "@/lib/rockit/rockIt";
import { RockItSongQueue } from "@/lib/rockit/rockItSongQueue";
import { getTime } from "@/lib/utils/getTime";

import { useStore } from "@nanostores/react";
import { Pause, Play } from "lucide-react";
import Image from "next/image";
import React from "react";

export function QueueSong({ song }: { song: RockItSongQueue }) {
    const $currentQueueSongId = useStore(
        rockIt.queueManager.currentQueueSongIdAtom
    );

    const $playing = useStore(rockIt.audioManager.playingAtom);

    // const handleClick = async () => {
    //     if (song.index == queueIndex.get() && playing.get()) {
    //         pause();
    //         return;
    //     }
    //     if (song.index == queueIndex.get() && !playing.get()) {
    //         play();
    //         return;
    //     }

    //     const tempQueue = queue.get();
    //     if (!tempQueue) return;

    //     const currentSongIndexInQueue = tempQueue.findIndex(
    //         (_song) => _song.index == song.index
    //     );

    //     queueIndex.set(tempQueue[currentSongIndexInQueue].index);

    //     const newSongId = tempQueue.find(
    //         (song) => song.index == queueIndex.get()
    //     )?.song.id;
    //     if (!newSongId) {
    //         return;
    //     }

    //     await fetch(`/api/song/${newSongId}`)
    //         .then((response) => response.json())
    //         .then((data: SongDB) => {
    //             playWhenReady.set(true);
    //             currentSong.set(data);
    //         });
    // };

    return (
        <li
            // onClick={handleClick}
            onClick={() => {
                console.warn("QueueSong handleClick");
            }}
            className={`group flex items-center gap-x-2 p-2 ${
                song.queueSongId === $currentQueueSongId
                    ? "bg-[rgba(50,50,50,0.75)]"
                    : "md:hover:bg-[rgba(75,75,75,0.75)]"
            }`}
        >
            <div className="relative">
                <Image
                    src={
                        song.song.internalImageUrl ??
                        rockIt.SONG_PLACEHOLDER_IMAGE_URL
                    }
                    alt={song.song.name}
                    className={`h-12 w-12 rounded object-cover ${
                        song.queueSongId === $currentQueueSongId
                            ? "brightness-50"
                            : ""
                    }`}
                    width={100}
                    height={100}
                />
                {song.queueSongId === $currentQueueSongId && $playing && (
                    <div className="absolute inset-0 flex items-center justify-center">
                        <Pause className="h-5 w-5 fill-current text-white" />
                    </div>
                )}
                {song.queueSongId === $currentQueueSongId && !$playing && (
                    <div className="absolute inset-0 flex items-center justify-center">
                        <Play className="h-5 w-5 fill-current text-white" />
                    </div>
                )}
            </div>
            <div className="max-w-full min-w-0 flex-1">
                <p className="truncate text-base font-semibold text-white">
                    <label className="text-xs text-yellow-400">
                        {song.queueSongId} -{" "}
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
