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
        setMouseDown(false);
        if (new Date().getTime() - startTimeMouseDownRef.current < 200) {
            const currentSongIndexInQueue = queue
                .get()
                .findIndex((_song) => _song.index == song.index);

            queueIndex.set(queue.get()[currentSongIndexInQueue].index);

            const newSongId = queue
                .get()
                .find((song) => song.index == queueIndex.get())?.song.id;
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
            className={`flex items-center gap-x-2 p-2 group ${dragging && "bg-[rgba(75,75,75,0.75)]"} ${
                song.index === $queueIndex
                    ? "bg-[rgba(50,50,50,0.75)]"
                    : "md:hover:bg-[rgba(75,75,75,0.75)]"
            }`}
        >
            {/* Espacio para el ícono */}
            <div className="h-10 items-center justify-center md:flex hidden">
                <div className={`opacity-0 group-hover:opacity-100`}>
                    <EllipsisVertical className="text-white w-5 h-12 md:hover:cursor-move" />
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
                    className={`w-12 h-12 rounded object-cover ${
                        song.index === $queueIndex ? "brightness-50" : ""
                    }`}
                />
                {/* Ícono Play */}
                {song.index === $queueIndex && (
                    <div className="absolute inset-0 flex items-center justify-center">
                        <Play className="text-white w-5 h-5 fill-current" />
                    </div>
                )}
            </div>
            {/* Song Info */}
            <div className="flex-1 min-w-0 max-w-full">
                <p className="text-white text-base font-semibold truncate">
                    <label className="text-xs text-yellow-400">
                        {song.index} -{" "}
                    </label>
                    {song.song.name}
                </p>
                <p className="text-gray-300 text-sm truncate">
                    {song.song.artists.map((artist) => artist.name).join(", ")}
                </p>
            </div>
            {/* Duration */}
            <p className="text-gray-300 text-sm px-2">
                {getTime(song.song.duration)}
            </p>
        </li>
    );
}
