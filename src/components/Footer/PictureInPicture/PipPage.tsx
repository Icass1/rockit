// components/PiPContent.tsx
"use client";

import { useState } from "react";
import {
    SkipBack,
    SkipForward,
    CirclePlay,
    CirclePause,
    Shuffle,
    Repeat1,
    Repeat,
} from "lucide-react";
import { useStore } from "@nanostores/react";
import {
    currentSong,
    playing,
    play,
    pause,
    prev,
    next,
    randomQueue,
    repeatSong,
    setTime,
    currentTime,
} from "@/stores/audio";
import LikeButton from "@/components/LikeButton";
import { cyclerepeatSong } from "../FooterCenter";
import { getTime } from "@/lib/getTime";

export default function PiPContent() {
    const $currentSong = useStore(currentSong);
    const $currentTime = useStore(currentTime);
    const $playing = useStore(playing);
    const $repeatSong = useStore(repeatSong);
    const [hover, setHover] = useState(false);

    return (
        <div
            onMouseEnter={() => setHover(true)}
            onMouseLeave={() => setHover(false)}
            style={{
                width: "100%",
                height: "100%",
                position: "relative",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                boxSizing: "border-box",
                fontFamily: "sans-serif",
                backgroundImage: "linear-gradient(to bottom, #202124, #121212)",
                overflow: "hidden",
                padding: "10px",
            }}
        >
            {/* Contenedor de la portada */}
            <div
                style={{
                    position: "relative",
                    userSelect: "none",
                    width: "100%",
                    aspectRatio: "1 / 1",
                }}
            >
                {/* Cover */}
                {$currentSong?.image && (
                    <img
                        src={`/api/image/${$currentSong.image}`}
                        alt="Cover"
                        style={{
                            width: "100%",
                            height: "100%",
                            objectFit: "cover",
                            borderRadius: "0.5rem",
                            boxShadow: "0 0 10px rgba(0,0,0,0.5)",
                        }}
                    />
                )}

                {/* Overlay de controles */}
                {hover && (
                    <div
                        style={{
                            position: "absolute",
                            inset: 0,
                            backgroundColor: "rgba(0,0,0,0.5)",
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            justifyContent: "center",
                            borderRadius: "0.5rem",
                            padding: "1rem",
                            boxSizing: "border-box",
                        }}
                    >
                        {/* Fila de iconos */}
                        <div
                            style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-around",
                                width: "100%",
                                marginBottom: "1rem",
                            }}
                        >
                            <button
                                onClick={() =>
                                    randomQueue.set(!randomQueue.get())
                                }
                                style={iconButton}
                            >
                                <Shuffle style={responsiveIcon} color="white" />
                            </button>
                            <button
                                onClick={async () => {
                                    await prev();
                                    play();
                                }}
                                style={iconButton}
                            >
                                <SkipBack
                                    style={responsiveIcon}
                                    color="white"
                                    fill="white"
                                />
                            </button>
                            <button
                                onClick={() => ($playing ? pause() : play())}
                                style={iconButton}
                                aria-label={$playing ? "Pause" : "Play"}
                            >
                                {$playing ? (
                                    <CirclePause
                                        style={{
                                            width: "10vw",
                                            minWidth: "35px",
                                            height: "10vw",
                                            minHeight: "35px",
                                        }}
                                        color="white"
                                    />
                                ) : (
                                    <CirclePlay
                                        style={{
                                            width: "10vw",
                                            minWidth: "35px",
                                            height: "10vw",
                                            minHeight: "35px",
                                        }}
                                        color="white"
                                    />
                                )}
                            </button>
                            <button
                                onClick={async () => {
                                    await next();
                                    play();
                                }}
                                style={iconButton}
                            >
                                <SkipForward
                                    style={responsiveIcon}
                                    color="white"
                                    fill="white"
                                />
                            </button>
                            <button
                                onClick={cyclerepeatSong}
                                style={iconButton}
                            >
                                {$repeatSong === "one" ? (
                                    <Repeat1
                                        style={responsiveIcon}
                                        color="white"
                                    />
                                ) : (
                                    <Repeat
                                        style={responsiveIcon}
                                        color="white"
                                    />
                                )}
                            </button>
                        </div>

                        {/* Slider de tiempo */}
                        <div
                            style={{
                                display: "flex",
                                alignItems: "center",
                                width: "100%",
                                height: "1.5rem",
                                gap: "0.5rem",
                            }}
                        >
                            {/* Tiempo actual */}
                            <span
                                id="current-time"
                                style={{
                                    minWidth: "1.5rem",
                                    fontSize: "0.75rem",
                                    fontWeight: 600,
                                    color: "white",
                                }}
                            >
                                {getTime($currentTime || 0)}
                            </span>

                            {/* Slider */}
                            <input
                                type="range"
                                id="default-slider"
                                value={$currentTime ?? 0}
                                min={0}
                                max={$currentSong?.duration ?? 0}
                                step={0.001}
                                onChange={(e) =>
                                    setTime(Number(e.target.value))
                                }
                                style={{
                                    flexGrow: 1,
                                    height: "4px",
                                    backgroundColor: "#707070",
                                    borderRadius: "2px",
                                    WebkitAppearance: "none",
                                }}
                            />
                            {/* Thumb styling */}
                            <style>{`
                            /* WebKit */
                            #default-slider::-webkit-slider-runnable-track {
                                height: 4px;
                                background: linear-gradient(
                                to right,
                                #ee1086 0%,
                                #fb6467 ${(($currentTime ?? 0) / ($currentSong?.duration ?? 1)) * 100}%,
                                #707070 ${(($currentTime ?? 0) / ($currentSong?.duration ?? 1)) * 100}%,
                                #707070 100%
                                );
                                border-radius: 2px;
                            }
                            #default-slider::-webkit-slider-thumb {
                                -webkit-appearance: none;
                                appearance: none;
                                width: 12px;
                                height: 12px;
                                margin-top: -4px;
                                border-radius: 50%;
                                background: white;
                                cursor: pointer;
                            }

                            /* Firefox */
                            #default-slider::-moz-range-track {
                                height: 4px;
                                background: #707070;
                                border-radius: 2px;
                            }
                            #default-slider::-moz-range-progress {
                                background: linear-gradient(to right, #ee1086, #fb6467);
                                height: 4px;
                                border-radius: 2px;
                            }
                            #default-slider::-moz-range-thumb {
                                width: 12px;
                                height: 12px;
                                border-radius: 50%;
                                background: white;
                                cursor: pointer;
                            }
                            `}</style>

                            {/* Tiempo total */}
                            <span
                                id="total-time"
                                style={{
                                    minWidth: "1.5rem",
                                    fontSize: "0.75rem",
                                    fontWeight: 600,
                                    color: "white",
                                }}
                            >
                                {getTime($currentSong?.duration || 0)}
                            </span>
                        </div>
                    </div>
                )}
            </div>

            {/* Info y botón de like */}
            <div
                style={{
                    marginTop: "10px",
                    display: "flex",
                    width: "80vw",
                    maxWidth: "300px",
                    alignItems: "center",
                    justifyContent: "space-between",
                    boxSizing: "border-box",
                }}
            >
                <div
                    style={{
                        color: "white",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        flex: 1,
                        paddingRight: "0.5rem",
                    }}
                >
                    <div
                        style={{
                            fontSize: "1rem",
                            fontWeight: 600,
                            lineHeight: 1.2,
                        }}
                    >
                        {$currentSong?.name || "Loading..."}
                    </div>
                    <div
                        style={{
                            fontSize: "0.875rem",
                            opacity: 0.75,
                            lineHeight: 1.2,
                        }}
                    >
                        {$currentSong?.artists.map((a) => a.name).join(", ") ||
                            "Loading..."}
                    </div>
                </div>
                {$currentSong && <LikeButton song={$currentSong} />}
            </div>
        </div>
    );
}

// Estilos reutilizables
const iconButton: React.CSSProperties = {
    background: "transparent",
    border: "none",
    cursor: "pointer",
    padding: 0,
};

const responsiveIcon: React.CSSProperties = {
    maxWidth: "50px",
    maxHeight: "50px",
    minWidth: "24px",
    minHeight: "24px",
    width: "5vw",
    height: "5vw",
    backgroundColor: "transparent",
};
