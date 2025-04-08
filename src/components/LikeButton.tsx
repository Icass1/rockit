"use client";

import type { SongDB } from "@/db/song";
import { likedSongs } from "@/stores/likedList";
import { useStore } from "@nanostores/react";
import type { MouseEvent } from "react";
import { useState } from "react";
import "@/styles/LikeButton.css";

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
                        likedSongs.set(
                            likedSongs
                                .get()
                                .filter((likedSong) => likedSong != song.id)
                        );
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
        }, 500);
    };

    return (
        <div className="relative flex h-full items-center justify-center overflow-visible">
            {/* Fuego animado */}
            {showFire && (
                <div className="pointer-events-none absolute top-1/3 left-1/2 -translate-x-[9px] -translate-y-1/2">
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
                className={`h-[22px] w-[22px] cursor-pointer ${
                    animateHand ? "hand-rotate" : ""
                }`}
                onClick={handleToggleLiked}
            >
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill={
                        $likedSongs.includes(song.id) ? "white" : "transparent"
                    }
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className={
                        "lucide lucide-hand-metal " +
                        ($likedSongs.includes(song.id)
                            ? "text-gray-800 transition-all md:hover:text-[#202020]"
                            : "text-gray-400 transition-all md:hover:text-white")
                    }
                >
                    <rect
                        x="6"
                        y="10"
                        width="11"
                        height="7"
                        strokeLinejoin="miter"
                        strokeWidth="0"
                    />
                    <path d="M18 12.5V10a2 2 0 0 0-2-2 2 2 0 0 0-2 2v1.4"></path>
                    <path d="M14 11V9a2 2 0 1 0-4 0v2"></path>
                    <path d="M10 11V5a2 2 2 1 0-4 0v9"></path>
                    <path d="m7 15-1.76-1.76a2 2 0 0 0-2.83 2.82l3.6 3.6C7.5 21.14 9.2 22 12 22h2a8 8 0 0 0 8-8V7a2 2 0 1 0-4 0v5"></path>
                </svg>
            </div>
        </div>
    );
}
