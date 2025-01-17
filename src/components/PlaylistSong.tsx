import {
    currentSong,
    play,
    queue,
    queueIndex,
    randomQueue,
} from "@/stores/audio";
import type { PlaylistDBSongWithAddedAt } from "@/lib/db";
import { getTime } from "@/lib/getTime";
import LikeButton from "./LikeButton";
import { ListPlus, EllipsisVertical } from "lucide-react";
import { useState } from "react";
import { currentList, currentListSongs } from "@/stores/currentList";
import { useStore } from "@nanostores/react";

export default function PlaylistSong({
    song,
}: {
    song: PlaylistDBSongWithAddedAt<
        | "name"
        | "albumId"
        | "duration"
        | "artists"
        | "path"
        | "albumName"
        | "image"
        | "id"
        | "images"
    >;
}) {
    const [hovered, setHovered] = useState(false);

    const $queue = useStore(queue);
    const $queueIndex = useStore(queueIndex);
    const $currentList = useStore(currentList);

    const handleClick = () => {
        if (!song.path) {
            return;
        }

        if ($currentList?.type == undefined || $currentList.id == undefined) {
            return;
        }

        const songsToAdd = currentListSongs.get().map((song, index) => {
            return {
                song: song,
                list: { type: $currentList.type, id: $currentList.id },
                index: index,
            };
        });

        if (randomQueue.get()) {
            const shuffled = [...songsToAdd].sort(() => Math.random() - 0.5);

            const firstSong = songsToAdd.find(
                (dataSong) => dataSong.song.id == song.id
            );
            if (!firstSong) {
                console.error(
                    "First song not found in songsToAdd in AlbumSong"
                );
                return;
            }

            currentSong.set(song);
            queueIndex.set(firstSong.index);
            queue.set(shuffled);
            // play();
        } else {
            const firstSong = songsToAdd.find(
                (dataSong) => dataSong.song.id == song.id
            );
            if (!firstSong) {
                console.error(
                    "First song not found in songsToAdd in AlbumSong"
                );
                return;
            }
            currentSong.set(song);
            queueIndex.set(firstSong.index);
            queue.set(songsToAdd);
            // play();
        }
    };

    return (
        <div
            className={
                "flex flex-row items-center gap-2 md:gap-4 transition-colors px-2 py-[0.5rem] rounded " +
                (!song.path ? "opacity-50" : "md:hover:bg-zinc-500/10") +
                ($queue.find((song) => song.index == $queueIndex)?.list?.id ==
                    $currentList?.id &&
                $queue.find((song) => song.index == $queueIndex)?.list?.type ==
                    $currentList?.type &&
                $queue.find((song) => song.index == $queueIndex)?.song.id ==
                    song.id
                    ? " text-[#ec5588]"
                    : "")
            }
            onClick={handleClick}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
        >
            {/* Imagen */}
            <div className="h-10 w-auto aspect-square rounded relative">
                <img
                    src={
                        (song?.images && song?.images[0]?.url) ||
                        "/song-placeholder.png"
                    }
                    className="rounded absolute top-0 bottom-0 left-0 right-0"
                />
            </div>

            {/* Contenedor principal */}
            <div className="grid grid-cols-[1fr_min-content] md:grid-cols-[1fr_1fr_min-content] w-full items-center">
                {/* Título (alineado a la izquierda) */}
                <div className="max-w-full min-w-0 w-full">
                    <a
                        className="text-base font-semibold hover:underline block w-fit max-w-full truncate pr-1"
                        href={`/song/${song.id}`}
                    >
                        {song.name}
                    </a>
                </div>

                {/* Artista y Álbum (centrados en la misma fila) */}
                <div className="hidden flex-1 md:flex flex-row gap-2 truncate pr-2">
                    <label className="text-md truncate max-w-[50%]">
                        {song.artists.map((artist, index) => (
                            <a
                                href={`/artist/${artist.id}`}
                                className="md:hover:underline"
                                key={index}
                                onClick={(event) => event.stopPropagation()}
                            >
                                {artist.name}
                                {index < song.artists.length - 1 ? ", " : ""}
                            </a>
                        ))}
                    </label>
                    <span className="mx-1">•</span>
                    <a
                        href={`/album/${song.albumId}`}
                        className="md:hover:underline text-md truncate"
                        onClick={(event) => event.stopPropagation()}
                    >
                        {song.albumName || "Artista desconocido"}
                    </a>
                </div>

                {/* Botones y tiempo (alineados a la derecha) */}
                <div className="flex items-center md:gap-4 ml-auto w-fit">
                    <LikeButton song={song} />
                    <ListPlus className="text-gray-400 hidden md:flex md:hover:text-white md:hover:scale-105 w-8" />
                    <EllipsisVertical className="text-gray-400 flex md:hidden md:hover:text-white md:hover:scale-105 w-8" />
                    <label className="text-sm text-white/80 select-none min-w-7 flex justify-center items-center">
                        {hovered && window.innerWidth > 768 ? (
                            <EllipsisVertical className="text-gray-400 md:hover:text-white md:hover:scale-105" />
                        ) : (
                            getTime(song.duration)
                        )}
                    </label>
                </div>
            </div>
        </div>
    );
}
