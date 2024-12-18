import { currentSong, play, queue, queueIndex } from "@/stores/audio";
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

    console.log($queue[$queueIndex ?? 0]);
    console.log($currentList);

    const handleClick = () => {
        const songs = currentListSongs.get();
        const list = currentList.get();
        if (!list) {
            console.error("List is not defined");
            return;
        }

        const songsToAdd = songs.map((song) => {
            return { song: song, list: { type: list.type, id: list.id } };
        });

        currentSong.set(song);
        play();

        const firstSong = songsToAdd.find(
            (dataSong) => dataSong.song.id == song.id
        );
        if (!firstSong) {
            console.error("song.id not in dataSong");
            return;
        }
        const index = songsToAdd.indexOf(firstSong);
        const newQueue = [
            ...songsToAdd.slice(0, index),
            firstSong,
            ...songsToAdd.slice(index + 1),
        ];
        queueIndex.set(index);
        queue.set(newQueue);
    };

    return (
        <div
            className={
                "flex flex-row items-center gap-4 transition-colors px-2 py-[0.5rem] rounded " +
                (!song.path ? "opacity-50" : "md:hover:bg-zinc-500/10") +
                ($queue[$queueIndex ?? 0].list?.id == $currentList?.id &&
                $queue[$queueIndex ?? 0].list?.type == $currentList?.type &&
                $queue[$queueIndex ?? 0].song.id == song.id
                    ? " text-green-500"
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
            <div className="flex flex-row w-full items-center justify-between">
                {/* Título (alineado a la izquierda) */}
                <div className="w-1/3">
                    <a
                        className="text-base font-semibold hover:underline block w-fit max-w-full truncate pr-1"
                        href={`/song/${song.id}`}
                    >
                        {song.name}
                    </a>
                </div>
                {/* Artista y Álbum (centrados en la misma fila) */}
                <div className="flex-1 flex flex-row gap-2 truncate">
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
                    <span className="mx-1">•</span>{" "}
                    {/* Separador opcional entre artista y álbum */}
                    <a
                        href={`/album/${song.albumId}`}
                        className="md:hover:underline text-md truncate"
                        onClick={(event) => event.stopPropagation()}
                    >
                        {song.albumName || "Artista desconocido"}
                    </a>
                </div>

                {/* Botones y tiempo (alineados a la derecha) */}
                <div className="flex items-center gap-4 flex-shrink-0">
                    <LikeButton song={song} />
                    <ListPlus className="text-gray-400 md:hover:text-white md:hover:scale-105 w-6" />
                    <label className="text-sm text-white/80 select-none flex justify-center items-center w-8">
                        {hovered ? (
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
