"use client";

import { useStore } from "@nanostores/react";
import "@/styles/LikeButton.css";
import { rockitIt } from "@/lib/rockit";

export default function LikeButton({ songPublicId }: { songPublicId: string }) {
    const $likedSongs = useStore(rockitIt.songManager.likedSongsAtom);

    return (
        <div
            style={{
                position: "relative",
                display: "flex",
                height: "100%",
                alignItems: "center",
                justifyContent: "center",
                overflow: "visible",
            }}
        >
            {/* Fuego animado */}
            {/* {showFire && (
                <div
                    style={{
                        pointerEvents: "none",
                        position: "absolute",
                        top: "33%",
                        left: "50%",
                        transform: "translate(-9px, -50%)",
                    }}
                >
                    <div className="flame-container">
                        <div className="red flame"></div>
                        <div className="orange flame"></div>
                        <div className="yellow flame"></div>
                        <div className="white flame"></div>
                        <div className="blue circle"></div>
                        <div className="black circle"></div>
                    </div>
                </div>
            )} */}

            {/* Mano de metal */}
            <div
                onClick={() =>
                    rockitIt.songManager.toggleLikeSong(songPublicId)
                }
                style={{
                    height: "22px",
                    width: "22px",
                    cursor: "pointer",
                    // transform: animateHand ? "rotate(20deg)" : undefined, // si usas hand-rotate
                    // transition: animateHand ? "transform 0.3s ease" : undefined,
                }}
            >
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill={
                        $likedSongs.includes(songPublicId)
                            ? "white"
                            : "transparent"
                    }
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    style={{
                        color: $likedSongs.includes(songPublicId)
                            ? "#202020"
                            : "#A1A1AA",
                        transition: "color 0.2s ease",
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.color = "#FFFFFF";
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.color = $likedSongs.includes(
                            songPublicId
                        )
                            ? "#202020"
                            : "#A1A1AA";
                    }}
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
