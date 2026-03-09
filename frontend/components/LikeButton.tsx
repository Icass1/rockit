"use client";

import { useEffect, useRef, useState } from "react";
import { useStore } from "@nanostores/react";
import "@/styles/LikeButton.css";
import { rockIt } from "@/lib/rockit/rockIt";

type FlameState = "hidden" | "enter" | "visible" | "exit";

const FLAME_DURATION_MS = 1000;

export default function LikeButton({
    mediaPublicId,
}: {
    mediaPublicId: string;
}) {
    const $likedMedias = useStore(rockIt.mediaManager.likedMediaAtom);
    const isLiked = $likedMedias.includes(mediaPublicId);

    const [flameState, setFlameState] = useState<FlameState>(
        isLiked ? "visible" : "hidden"
    );
    const [handTilt, setHandTilt] = useState(false);

    const prevLiked = useRef(isLiked);
    const dismissTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    // React to like/unlike changes

    useEffect(() => {
        if (prevLiked.current === isLiked) return;
        prevLiked.current = isLiked;

        if (isLiked) {
            queueMicrotask(() => {
                setFlameState("enter");
            });
        }
    }, [isLiked]);

    // Auto-dismiss: once enter settles to "visible", start the countdown
    useEffect(() => {
        if (flameState !== "visible") return;

        dismissTimer.current = setTimeout(() => {
            setFlameState("exit");
        }, FLAME_DURATION_MS);

        return () => {
            if (dismissTimer.current) clearTimeout(dismissTimer.current);
        };
    }, [flameState]);

    const handleFlameAnimationEnd = () => {
        if (flameState === "enter") setFlameState("visible");
        if (flameState === "exit") setFlameState("hidden");
    };

    const handleClick = () => {
        setHandTilt(true);
        rockIt.mediaManager.toggleLikeMedia(mediaPublicId);
    };

    const flameVisible = flameState !== "hidden";

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
            {flameVisible && (
                <div
                    className={[
                        "flame-wrapper",
                        flameState === "enter" ? "flame-wrapper--enter" : "",
                        flameState === "exit" ? "flame-wrapper--exit" : "",
                    ]
                        .filter(Boolean)
                        .join(" ")}
                    onAnimationEnd={handleFlameAnimationEnd}
                >
                    <div className="flame-container">
                        <div className="red flame" />
                        <div className="orange flame" />
                        <div className="yellow flame" />
                        <div className="white flame" />
                        <div className="blue circle" />
                    </div>
                </div>
            )}

            <div
                role="button"
                aria-label={isLiked ? "Unlike" : "Like"}
                aria-pressed={isLiked}
                onClick={handleClick}
                className={handTilt ? "hand-tilt" : undefined}
                onAnimationEnd={() => setHandTilt(false)}
                style={{
                    height: "22px",
                    width: "22px",
                    cursor: "pointer",
                    position: "relative",
                    zIndex: 1,
                }}
            >
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill={isLiked ? "white" : "transparent"}
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    style={{
                        color: isLiked ? "#202020" : "#A1A1AA",
                        transition: "fill 0.2s ease, color 0.2s ease",
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.color = "#FFFFFF";
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.color = isLiked
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
                    <path d="M18 12.5V10a2 2 0 0 0-2-2 2 2 0 0 0-2 2v1.4" />
                    <path d="M14 11V9a2 2 0 1 0-4 0v2" />
                    <path d="M10 11V5a2 2 0 1 0-4 0v9" />
                    <path d="m7 15-1.76-1.76a2 2 0 0 0-2.83 2.82l3.6 3.6C7.5 21.14 9.2 22 12 22h2a8 8 0 0 0 8-8V7a2 2 0 1 0-4 0v5" />
                </svg>
            </div>
        </div>
    );
}
