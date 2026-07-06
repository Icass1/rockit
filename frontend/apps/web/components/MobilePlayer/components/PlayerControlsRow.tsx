"use client";

import type { JSX } from "react";
import { ERepeatMode } from "@rockit/shared";
import {
    Pause,
    Play,
    Repeat,
    Shuffle,
    SkipBack,
    SkipForward,
} from "lucide-react";
import { usePlayer } from "@/lib/PlayerContext";

function repeatColor(mode: ERepeatMode): string {
    return mode === ERepeatMode.OFF
        ? "rgba(255,255,255,0.5)"
        : "var(--color-rockit-pink)";
}

export default function PlayerControlsRow(): JSX.Element {
    const {
        isPlaying,
        repeatMode,
        togglePlayPause,
        skipForward,
        skipBack,
        toggleShuffle,
        cycleRepeat,
    } = usePlayer();

    return (
        <div className="flex w-full items-center justify-evenly px-1">
            <button
                type="button"
                onClick={toggleShuffle}
                className="flex h-12 w-12 items-center justify-center"
                aria-label="Aleatorio"
            >
                <Shuffle size={24} color="white" />
            </button>

            <button
                type="button"
                onClick={skipBack}
                className="flex h-12 w-12 items-center justify-center"
                aria-label="Anterior"
            >
                <SkipBack size={24} className="fill-current text-white" />
            </button>

            <button
                type="button"
                onClick={togglePlayPause}
                className="flex h-15 w-15 items-center justify-center rounded-full transition-transform active:scale-95"
                aria-label={isPlaying ? "Pausar" : "Reproducir"}
            >
                {isPlaying ? (
                    <Pause size={34} className="fill-current text-white" />
                ) : (
                    <Play size={34} className="fill-current text-white" />
                )}
            </button>

            <button
                type="button"
                onClick={skipForward}
                className="flex h-12 w-12 items-center justify-center"
                aria-label="Siguiente"
            >
                <SkipForward size={24} className="fill-current text-white" />
            </button>

            <button
                type="button"
                onClick={cycleRepeat}
                className="relative flex h-12 w-12 items-center justify-center"
                aria-label="Repetir"
            >
                <Repeat size={24} color={repeatColor(repeatMode)} />
                {repeatMode === ERepeatMode.ONE && (
                    <span className="absolute -right-0.5 -bottom-1 text-[8px] font-bold text-(--color-rockit-pink)">
                        1
                    </span>
                )}
            </button>
        </div>
    );
}
