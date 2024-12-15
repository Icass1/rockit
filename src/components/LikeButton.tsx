import type { SongDB } from "@/lib/db";
import { likedSongs } from "@/stores/likedList";
import { useStore } from "@nanostores/react";
import { HandMetal } from "lucide-react";
import type { MouseEvent } from "react";

export default function LikeButton({ song }: { song: SongDB<"id"> }) {
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

    return (
        // Previous: Heart
        <div className="min-w-5 min-h-5 h-full aspect-square">
            <HandMetal
                className="w-[22px] h-[22px] cursor-pointer transition-all text-gray-400 md:hover:text-white md:hover:scale-105"
                onClick={handleToggleLiked}
                fill={$likedSongs.includes(song.id) ? "white" : "transparent"}
            />
        </div>
    );
}
