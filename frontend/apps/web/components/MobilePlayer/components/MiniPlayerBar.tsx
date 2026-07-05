"use client";

import type { JSX } from "react";
import { Pause, Play, SkipForward } from "lucide-react";
import { usePlayer, usePlayerTime } from "@/lib/PlayerContext";

export const MINI_PLAYER_HEIGHT = 56;

export default function MiniPlayerBar(): JSX.Element | null {
    const {
        currentMedia,
        isPlaying,
        isLoading,
        isPlayerVisible,
        togglePlayPause,
        skipForward,
        showPlayer,
    } = usePlayer();
    const { currentTime, duration } = usePlayerTime();

    if (!currentMedia || isPlayerVisible) return null;

    const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

    return (
        <div
            className="fixed inset-x-0 bottom-0 z-40 h-14 bg-black/70 backdrop-blur-md"
            style={{ height: MINI_PLAYER_HEIGHT }}
        >
            <div
                className={`absolute left-0 top-0 h-full w-[3px] transition-colors ${
                    isPlaying ? "bg-[var(--color-rockit-pink)]" : "bg-transparent"
                }`}
            />

            <button
                type="button"
                onClick={showPlayer}
                className="flex h-full w-full items-center gap-3 pr-3 text-left"
            >
                <div className="h-14 w-14 shrink-0 p-1">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                        src={currentMedia.imageUrl}
                        alt=""
                        loading="lazy"
                        className="h-full w-full rounded object-cover bg-[var(--color-surface)]"
                    />
                </div>

                <div className="min-w-0 flex-1">
                    <p className="truncate text-base font-semibold text-white">
                        {currentMedia.name}
                    </p>
                    <p className="truncate text-sm text-[var(--color-muted)]">
                        {"artists" in currentMedia
                            ? (currentMedia.artists[0]?.name ?? "")
                            : ""}
                    </p>
                </div>

                <span
                    role="button"
                    aria-label={isPlaying ? "Pausar" : "Reproducir"}
                    onClick={(e) => {
                        e.stopPropagation();
                        togglePlayPause();
                    }}
                    className="flex h-10 w-10 shrink-0 items-center justify-center"
                >
                    {isLoading ? (
                        <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    ) : isPlaying ? (
                        <Pause size={22} color="white" />
                    ) : (
                        <Play size={22} color="white" />
                    )}
                </span>

                <span
                    role="button"
                    aria-label="Siguiente"
                    onClick={(e) => {
                        e.stopPropagation();
                        skipForward();
                    }}
                    className="flex h-10 w-10 shrink-0 items-center justify-center"
                >
                    <SkipForward size={22} color="white" />
                </span>
            </button>

            {/* Progress hint */}
            <div className="absolute inset-x-0 bottom-0 h-[2px] bg-white/10">
                <div
                    className="h-full bg-gradient-to-r from-[var(--color-rockit-pink)] via-[var(--color-rockit-pink-mid)] to-[var(--color-rockit-pink-light)] transition-[width] duration-300"
                    style={{ width: `${progressPercent}%` }}
                />
            </div>
        </div>
    );
}
