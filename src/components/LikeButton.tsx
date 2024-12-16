import type { SongDB } from "@/lib/db";
import { likedSongs } from "@/stores/likedList";
import { useStore } from "@nanostores/react";
import { HandMetal } from "lucide-react";
import type { MouseEvent } from "react";
import { useState } from "react";
import "src/styles/LikeButton.css";

export default function LikeButton({ song }: { song: SongDB<"id"> }) {
    const $likedSongs = useStore(likedSongs);
    const [showFire, setShowFire] = useState(false);
    const [animateHand, setAnimateHand] = useState(false);

    const handleToggleLiked = (event: MouseEvent) => {
        event.stopPropagation();

        if (likedSongs.get().includes(song.id)) {
            setAnimateHand(true);
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
            setShowFire(true);
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

        // Restablecer después de las animaciones
        setTimeout(() => {
            setAnimateHand(false);
            setShowFire(false);
        }, 750);
    };

    return (
        <div className="relative flex justify-center items-center h-full overflow-visible">
            {/* Fuego animado */}
            {showFire && (
                <div className="absolute top-1/3 left-1/2 -translate-x-[9px] -translate-y-1/2 pointer-events-none">
                    <div className="container">
                        <div className="red flame"></div>
                        <div className="orange flame"></div>
                        <div className="yellow flame"></div>
                        <div className="white flame"></div>
                        <div className="blue circle"></div>
                        <div className="black circle"></div>
                    </div>
                </div>
            )}

            {/* Mano de metal */}
            <div
                className={`w-[22px] h-[22px] cursor-pointer z-10 ${
                    animateHand ? "hand-rotate" : ""
                }`}
                onClick={handleToggleLiked}
            >
                <HandMetal
                    className={$likedSongs.includes(song.id) ? "transition-all text-gray-800 md:hover:text-black" : "transition-all text-gray-400 md:hover:text-white drop-shadow-md"} 
                    fill={$likedSongs.includes(song.id) ? "white" : "transparent"}
                    style={{
                        filter: $likedSongs.includes(song.id)
                            ? "drop-shadow(0px 0px 4px white)"
                            : "none",
                    }}
                />
            </div>
        </div>
    );
}