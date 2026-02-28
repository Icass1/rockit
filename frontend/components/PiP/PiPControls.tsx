"use client";

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
import { rockIt } from "@/lib/rockit/rockIt";

const S = {
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
};

interface PiPControlsProps {
    show: boolean;
}

export function PiPControls({ show }: PiPControlsProps) {
    const $playing = useStore(rockIt.audioManager.playingAtom);
    const $repeatSong = useStore(rockIt.userManager.repeatSongAtom);

    if (!show) return null;

    return (
        <div style={S.controls as React.CSSProperties}>
            <button
                style={S.iconBtn}
                onClick={() => rockIt.userManager.toggleRandomQueue()}
            >
                <Shuffle style={S.icon} color="white" />
            </button>
            <button
                style={S.iconBtn}
                onClick={() => rockIt.queueManager.skipBack()}
            >
                <SkipBack style={S.icon} color="white" fill="white" />
            </button>
            <button
                style={S.iconBtn}
                onClick={() => rockIt.audioManager.togglePlayPauseOrSetSong()}
                aria-label={$playing ? "Pause" : "Play"}
            >
                {$playing ? (
                    <CirclePause style={S.playIcon} color="white" />
                ) : (
                    <CirclePlay style={S.playIcon} color="white" />
                )}
            </button>
            <button
                style={S.iconBtn}
                onClick={() => rockIt.queueManager.skipForward()}
            >
                <SkipForward style={S.icon} color="white" fill="white" />
            </button>
            <button
                style={S.iconBtn}
                onClick={() => rockIt.userManager.cyclerepeatSong()}
            >
                {$repeatSong === "one" ? (
                    <Repeat1 style={S.icon} color="white" />
                ) : (
                    <Repeat style={S.icon} color="white" />
                )}
            </button>
        </div>
    );
}
