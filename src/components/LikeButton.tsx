import type { SongDB } from "@/lib/db";
import { likedSongs } from "@/stores/likedList";
import { useStore } from "@nanostores/react";
import { HandMetal } from "lucide-react";
import type { MouseEvent } from "react";
import { useState } from "react";
import 'src/styles/LikeButton.css'

export default function LikeButton({ song }: { song: SongDB<"id"> }) {
    const $likedSongs = useStore(likedSongs);
    const [showFire, setShowFire] = useState(false);
    const [animateHand, setAnimateHand] = useState(false);

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

        // Activar animaciones
        setAnimateHand(true);
        setShowFire(true);

        // Restablecer después de las animaciones
        setTimeout(() => {
            setAnimateHand(false);
            setShowFire(false);
        }, 500);
    };

    return (
        <div className="relative min-w-5 min-h-5 h-full aspect-square">
            {/* Llama de fuego */}
            {showFire && (
                <div className="absolute inset-0 flex items-center justify-center z-[6]">
                    <div className="fire-animation"></div>
                </div>
            )}

            {/* Mano */}
            <div
                className={`w-[22px] h-[22px] cursor-pointer z-[7] ${
                    animateHand ? "hand-rotate" : ""
                }`}
                onClick={handleToggleLiked}
            >
                <HandMetal
                    className="transition-all text-gray-400 md:hover:text-white"
                    fill={$likedSongs.includes(song.id) ? "white" : "transparent"}
                />
            </div>
        </div>
    );
}

//https://codepen.io/dazulu/pen/nPeEeG