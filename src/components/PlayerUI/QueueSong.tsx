"use client";

import type { SongDB } from "@/lib/db/song";
import { getImageUrl } from "@/lib/getImageUrl";
import { getTime } from "@/lib/getTime";
import {
    currentSong,
    playWhenReady,
    queue,
    queueIndex,
    type QueueElement,
} from "@/stores/audio";
import { useStore } from "@nanostores/react";
import { EllipsisVertical, Play } from "lucide-react";
import { useRef, useState } from "react";

export function QueueSong({
    song,
    onDrag,
    dragging = false,
}: {
    song: QueueElement;
    dragging?: boolean;
    onDrag?: () => void;
}) {
    const $queueIndex = useStore(queueIndex);

    const startTimeMouseDownRef = useRef(100);
    const [mouseDown, setMouseDown] = useState(false);

    const handleMouseDown = () => {
        startTimeMouseDownRef.current = new Date().getTime();
        setMouseDown(true);
    };
    const handleMouseMove = () => {
        if (onDrag) onDrag();
    };
    const handleMouseUp = async () => {
        const tempQueue = queue.get();
        if (!tempQueue) return;

        setMouseDown(false);
        if (new Date().getTime() - startTimeMouseDownRef.current < 200) {
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
        }
    };

    return (
        <li
            // onClick={handleClick}
            onMouseDown={handleMouseDown}
            onMouseUp={handleMouseUp}
            onMouseMove={mouseDown ? handleMouseMove : undefined}
            className={`group flex items-center gap-x-2 p-2 ${
                dragging && "bg-[rgba(75,75,75,0.75)]"
            } ${
                song.index === $queueIndex
                    ? "bg-[rgba(50,50,50,0.75)]"
                    : "md:hover:bg-[rgba(75,75,75,0.75)]"
            }`}
        >
            {/* Espacio para el ícono */}
            <div className="hidden h-10 items-center justify-center md:flex">
                <div className={`opacity-0 group-hover:opacity-100`}>
                    <EllipsisVertical className="h-12 w-5 text-white md:hover:cursor-move" />
                </div>
            </div>
            {/* Cover */}
            <div className="relative">
                {/* Imagen de portada */}
                <img
                    src={getImageUrl({
                        imageId: song.song.image,
                        width: 48,
                        height: 48,
                        placeHolder: "/song-placeholder.png",
                    })}
                    alt={song.song.name}
                    className={`h-12 w-12 rounded object-cover ${
                        song.index === $queueIndex ? "brightness-50" : ""
                    }`}
                />
                {/* Ícono Play */}
                {song.index === $queueIndex && (
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
