import { currentSong, play, queue, queueIndex } from "@/stores/audio";
import type { PlaylistDB, SongDB } from "@/lib/db";
import { getTime } from "@/lib/getTime";
import { Heart } from "lucide-react";
import { useStore } from "@nanostores/react";
import { likedSongs } from "@/stores/likedList";
import type { MouseEvent } from "react";

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
    const $likedSongs = useStore(likedSongs);

    const handleToggleLiked = (event: MouseEvent) => {
        event.stopPropagation();

        if (likedSongs.get().includes(song.id)) {
            fetch(`/api/like/${song.id}`, { method: "DELETE" }).then(
                (response) => {
                    if (response.ok) {
                        // Remove song to liked songs store
                        likedSongs.set([
                            ...likedSongs
                                .get()
                                .filter((likedSong) => likedSong != song.id),
                        ]);
                    } else {
                        console.log("Error");
                        // Tell user like request was unsuccessful
                    }
                }
            );
        } else {
            fetch(`/api/like/${song.id}`, { method: "POST" }).then(
                (response) => {
                    if (response.ok) {
                        // Add song to liked songs store
                        likedSongs.set([...likedSongs.get(), song.id]);
                    } else {
                        console.log("Error");
                        // Tell user like request was unsuccessful
                    }
                }
            );
        }
    };

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
                            const firstSong = data.find(
                                (dataSong) => dataSong.id == song.id
                            );
                            if (!firstSong) {
                                console.error("song.id not in dataSong");
                                return;
                            }
                            const index = data.indexOf(firstSong);
                            const newQueue = [
                                firstSong,
                                ...data.slice(0, index),
                                ...data.slice(index + 1),
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
                "flex flex-row items-center gap-4  transition-colors px-2 py-1 rounded " +
                (!song.path ? "opacity-50" : "md:hover:bg-zinc-500/10")
            }
            onClick={handleClick}
        >
            <img
                src={`/api/image/${song.image}`}
                className="h-14 w-auto rounded"
            />
            <div className="w-full flex flex-col">
                <label className="text-base font-semibold truncate w-full">
                    {song.name}
                </label>
                <label className="text-sm truncate  w-full">
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
            </div>
            <a
                href={`/album/${song.albumId}`}
                className="md:hover:underline text-nowrap w-full truncate"
                onClick={(event) => event.stopPropagation()}
            >
                {song.albumName || "Artista desconocido"}
            </a>
            <Heart
                className="cursor-pointer transition-all w-10"
                onClick={handleToggleLiked}
                fill={$likedSongs.includes(song.id) ? "white" : ""}
            />
            <label className="text-sm text-white/80">
                {getTime(song.duration)}
            </label>
        </div>
    );
}
