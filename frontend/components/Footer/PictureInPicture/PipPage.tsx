"use client";

import { useState } from "react";
import Image from "next/image";
import { rockIt } from "@/lib/rockit/rockIt";
import { getTime } from "@/lib/utils/getTime";
import LikeButton from "@/components/LikeButton";
import { useStore } from "@nanostores/react";
import {
    CirclePause,
    CirclePlay,
    Repeat,
    Repeat1,
    Shuffle,
    SkipBack,
    SkipForward,
} from "lucide-react";

// Inline styles are intentional here — PiP runs in a separate browsing context
// and Tailwind classes may not be reliably available.
const S = {
    root: {
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "sans-serif",
        backgroundImage: "linear-gradient(to bottom, #202124, #121212)",
        overflow: "hidden",
        padding: "10px",
        boxSizing: "border-box",
    },
    coverWrapper: {
        position: "relative",
        width: "100%",
        aspectRatio: "1 / 1",
        userSelect: "none",
    },
    cover: {
        width: "100%",
        height: "100%",
        objectFit: "cover",
        borderRadius: "0.5rem",
        boxShadow: "0 0 10px rgba(0,0,0,0.5)",
        display: "block",
    },
    overlay: {
        position: "absolute",
        inset: 0,
        backgroundColor: "rgba(0,0,0,0.55)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: "0.5rem",
        padding: "1rem",
        boxSizing: "border-box",
    },
    controls: {
        display: "flex",
        alignItems: "center",
        justifyContent: "space-around",
        width: "100%",
        marginBottom: "1rem",
    },
    iconBtn: {
        background: "transparent",
        border: "none",
        cursor: "pointer",
        padding: 0,
    } as React.CSSProperties,
    icon: {
        width: "5vw",
        height: "5vw",
        minWidth: "24px",
        minHeight: "24px",
        maxWidth: "50px",
        maxHeight: "50px",
    } as React.CSSProperties,
    playIcon: {
        width: "10vw",
        height: "10vw",
        minWidth: "35px",
        minHeight: "35px",
    } as React.CSSProperties,
    progressRow: {
        display: "flex",
        alignItems: "center",
        width: "100%",
        height: "1.5rem",
        gap: "0.5rem",
    },
    timeLabel: {
        minWidth: "1.5rem",
        fontSize: "0.75rem",
        fontWeight: 600,
        color: "white",
    },
    infoRow: {
        marginTop: "10px",
        display: "flex",
        width: "100%",
        maxWidth: "300px",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "0.5rem",
        boxSizing: "border-box",
    },
    infoText: {
        color: "white",
        overflow: "hidden",
        flex: 1,
        paddingRight: "0.5rem",
    },
    songName: {
        fontSize: "1rem",
        fontWeight: 600,
        lineHeight: 1.2,
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
    },
    artistName: {
        fontSize: "0.875rem",
        opacity: 0.75,
        lineHeight: 1.2,
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
    },
} satisfies Record<string, React.CSSProperties>;

export default function PiPContent() {
    const $currentSong = useStore(rockIt.queueManager.currentSongAtom);
    const $currentTime = useStore(rockIt.audioManager.currentTimeAtom);
    const $playing = useStore(rockIt.audioManager.playingAtom);
    const $repeatSong = useStore(rockIt.userManager.repeatSongAtom);
    const [hover, setHover] = useState(false);

    const progress =
        (($currentTime ?? 0) / ($currentSong?.duration ?? 1)) * 100;

    return (
        <div
            style={S.root as React.CSSProperties}
            onMouseEnter={() => setHover(true)}
            onMouseLeave={() => setHover(false)}
        >
            {/* Cover + controls overlay */}
            <div style={S.coverWrapper as React.CSSProperties}>
                {$currentSong?.internalImageUrl && (
                    <Image
                        src={`/api/image/${$currentSong.internalImageUrl}`}
                        alt={`Cover of ${$currentSong.name}`}
                        fill
                        style={{ objectFit: "cover" }}
                        className="rounded-lg"
                    />
                )}

                {hover && (
                    <div style={S.overlay as React.CSSProperties}>
                        {/* Controls */}
                        <div style={S.controls as React.CSSProperties}>
                            <button
                                style={S.iconBtn}
                                onClick={() =>
                                    rockIt.userManager.toggleRandomQueue()
                                }
                            >
                                <Shuffle style={S.icon} color="white" />
                            </button>
                            <button
                                style={S.iconBtn}
                                onClick={() => rockIt.queueManager.skipBack()}
                            >
                                <SkipBack
                                    style={S.icon}
                                    color="white"
                                    fill="white"
                                />
                            </button>
                            <button
                                style={S.iconBtn}
                                onClick={() =>
                                    rockIt.audioManager.togglePlayPauseOrSetSong()
                                }
                                aria-label={$playing ? "Pause" : "Play"}
                            >
                                {$playing ? (
                                    <CirclePause
                                        style={S.playIcon}
                                        color="white"
                                    />
                                ) : (
                                    <CirclePlay
                                        style={S.playIcon}
                                        color="white"
                                    />
                                )}
                            </button>
                            <button
                                style={S.iconBtn}
                                onClick={() =>
                                    rockIt.queueManager.skipForward()
                                }
                            >
                                <SkipForward
                                    style={S.icon}
                                    color="white"
                                    fill="white"
                                />
                            </button>
                            <button
                                style={S.iconBtn}
                                onClick={() =>
                                    rockIt.userManager.cyclerepeatSong()
                                }
                            >
                                {$repeatSong === "one" ? (
                                    <Repeat1 style={S.icon} color="white" />
                                ) : (
                                    <Repeat style={S.icon} color="white" />
                                )}
                            </button>
                        </div>

                        {/* Progress */}
                        <div style={S.progressRow as React.CSSProperties}>
                            <span style={S.timeLabel as React.CSSProperties}>
                                {getTime($currentTime ?? 0)}
                            </span>
                            <input
                                type="range"
                                className="pip-slider"
                                value={$currentTime ?? 0}
                                min={0}
                                max={$currentSong?.duration ?? 0}
                                step={0.001}
                                style={{ flexGrow: 1 }}
                                onChange={(e) =>
                                    rockIt.audioManager.setCurrentTime(
                                        Number(e.target.value)
                                    )
                                }
                            />
                            <style>{`
                                .pip-slider {
                                    -webkit-appearance: none;
                                    height: 4px;
                                    background: #707070;
                                    border-radius: 2px;
                                    cursor: pointer;
                                }
                                .pip-slider::-webkit-slider-runnable-track {
                                    height: 4px;
                                    border-radius: 2px;
                                    background: linear-gradient(
                                        to right,
                                        #ee1086 0%,
                                        #fb6467 ${progress}%,
                                        #707070 ${progress}%,
                                        #707070 100%
                                    );
                                }
                                .pip-slider::-webkit-slider-thumb {
                                    -webkit-appearance: none;
                                    width: 12px;
                                    height: 12px;
                                    margin-top: -4px;
                                    border-radius: 50%;
                                    background: white;
                                    cursor: pointer;
                                }
                                .pip-slider::-moz-range-track {
                                    height: 4px;
                                    background: #707070;
                                    border-radius: 2px;
                                }
                                .pip-slider::-moz-range-progress {
                                    height: 4px;
                                    border-radius: 2px;
                                    background: linear-gradient(to right, #ee1086, #fb6467);
                                }
                                .pip-slider::-moz-range-thumb {
                                    width: 12px;
                                    height: 12px;
                                    border-radius: 50%;
                                    background: white;
                                    border: none;
                                    cursor: pointer;
                                }
                            `}</style>
                            <span style={S.timeLabel as React.CSSProperties}>
                                {getTime($currentSong?.duration ?? 0)}
                            </span>
                        </div>
                    </div>
                )}
            </div>

            {/* Song info + like */}
            <div style={S.infoRow as React.CSSProperties}>
                <div style={S.infoText as React.CSSProperties}>
                    <p style={S.songName as React.CSSProperties}>
                        {$currentSong?.name}
                    </p>
                    <p style={S.artistName as React.CSSProperties}>
                        {$currentSong?.artists.map((a) => a.name).join(", ")}
                    </p>
                </div>
                {$currentSong && (
                    <LikeButton songPublicId={$currentSong.publicId} />
                )}
            </div>
        </div>
    );
}
