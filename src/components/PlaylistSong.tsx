import { currentSong, play, queue, queueIndex } from "@/stores/audio";
import type { PlaylistDB, SongDB } from "@/lib/db";
import { getTime } from "@/lib/getTime";
import LikeButton from "./LikeButton";
import { ListPlus, EllipsisVertical } from "lucide-react";
import { useState } from "react";

export default function PlaylistSong({
    song,
    playlistId,
}: {
    song: SongDB<
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
    playlistId: string;
}) {
    const [hovered, setHovered] = useState(false);

    const handleClick = () => {
        if (!song.path) {
            return;
        }
        currentSong.set(song);
        play();

        fetch(`/api/playlist/${playlistId}`)
            .then((response) => response.json())
            .then((data: PlaylistDB) => {
                fetch(
                    `/api/songs?songs=${data.songs
                        .map((song) => song.id)
                        .join(",")}&q=name,artists,id,images,duration`
                )
                    .then((response) => response.json())
                    .then(
                        (
                            data: SongDB<
                                | "name"
                                | "artists"
                                | "id"
                                | "images"
                                | "duration"
                            >[]
                        ) => {
                            const newData = data.map((song) => {
                                return {
                                    song: song,
                                    list: { type: "playlist", id: playlistId },
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
                        }
                    );
            });
    };
    return (
        <div
            className={
                "flex flex-row items-center gap-4 transition-colors px-2 py-[0.5rem] rounded " +
                (!song.path ? "opacity-50" : "md:hover:bg-zinc-500/10")
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
                        className="text-base font-semibold hover:underline  truncate"
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
