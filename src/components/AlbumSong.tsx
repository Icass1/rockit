import { currentSong, play, queue, queueIndex } from "@/stores/audio";
import type { SongDB } from "@/lib/db";
import { getTime } from "@/lib/getTime";
import type { RockItAlbum } from "@/types/rockIt";
import { Heart } from "lucide-react";
import type { MouseEvent } from "react";
import { useStore } from "@nanostores/react";
import { likedSongs } from "@/stores/likedList";

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
    const $likedSongs = useStore(likedSongs);

    const handleClick = () => {
        if (!song.path) {
            return;
        }
        currentSong.set(song);
        play();

        fetch(`/api/album/${albumId}`)
            .then((response) => response.json())
            .then((data: RockItAlbum) => {
                const firstSong = data.songs.find(
                    (dataSong) => dataSong.id == song.id
                );
                if (!firstSong) {
                    console.error("song.id not in dataSong");
                    return;
                }
                const index = data.songs.indexOf(firstSong);
                const newQueue = [
                    firstSong,
                    ...data.songs.slice(0, index),
                    ...data.songs.slice(index + 1),
                ];
                queueIndex.set(0);
                queue.set(newQueue);
            });
    };

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

    return (
        <div
            className={
                "flex flex-row items-center gap-4  transition-colors px-2 py-1 rounded " +
                (!song.path ? "opacity-50" : "md:hover:bg-zinc-500/10")
            }
            onClick={handleClick}
        >
            <label className="text-sm text-white/80 w-10 text-center">
                {index + 1}
            </label>
            <label className="text-base font-semibold w-full">
                {song.name}{" "}
            </label>
            <Heart
                className="cursor-pointer transition-all w-10"
                onClick={handleToggleLiked}
                fill={$likedSongs.includes(song.id) ? "white" : ""}
            />
            <label className="text-sm text-white/80 select-none">
                {getTime(song.duration)}
            </label>
        </div>
    );
}
