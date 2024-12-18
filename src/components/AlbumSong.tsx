import { currentSong, play, queue, queueIndex } from "@/stores/audio";
import type { SongDB } from "@/lib/db";
import { getTime } from "@/lib/getTime";
import type { RockItAlbum } from "@/types/rockIt";
import LikeButton from "./LikeButton";
import { ListPlus, EllipsisVertical } from "lucide-react";
import { useState } from "react";

export default function AlbumSong({
    song,
    index,
    albumId,
}: {
    song: SongDB<
        | "images"
        | "id"
        | "name"
        | "artists"
        | "albumId"
        | "albumName"
        | "path"
        | "duration"
    >;
    index: number;
    albumId: string;
}) {
    const [hovered, setHovered] = useState(false);

    const handleClick = () => {
        if (!song.path) {
            return;
        }
        currentSong.set(song);
        play();

        fetch(`/api/album/${albumId}`)
            .then((response) => response.json())
            .then((data: RockItAlbum) => {
                const newData = data.songs.map((song) => {
                    return {
                        song: song,
                        list: { type: "album", id: albumId },
                    };
                });

                const firstSong = newData.find(
                    (dataSong) => dataSong.song.id == song.id
                );
                if (!firstSong) {
                    console.error("song.id not in dataSong");
                    return;
                }
                const index = newData.indexOf(firstSong);
                const newQueue = [
                    firstSong,
                    ...newData.slice(0, index),
                    ...newData.slice(index + 1),
                ];
                queueIndex.set(0);
                queue.set(newQueue);
            });
    };

    return (
        <div
            className={
                "flex flex-row items-center gap-4 transition-colors px-2 py-[0.65rem] rounded " +
                (!song.path ? "opacity-50" : "md:hover:bg-zinc-500/10")
            }
            onClick={handleClick}
            onMouseEnter={() => {
                setHovered(true);
            }}
            onMouseLeave={() => {
                setHovered(false);
            }}
        >
            <label className="text-md text-white/80 w-5 text-center">
                {index + 1}
            </label>
            <label className="text-base font-semibold w-full">
                {song.name}{" "}
            </label>
            <LikeButton song={song} />
            <ListPlus className="text-gray-400 md:hover:text-white md:hover:scale-105 w-8" />
            <label className="text-sm text-white/80 select-none min-w-7 flex justify-center items-center">
                {hovered ? (
                    <EllipsisVertical className="text-gray-400 md:hover:text-white md:hover:scale-105" />
                ) : (
                    getTime(song.duration)
                )}
            </label>
        </div>
    );
}
