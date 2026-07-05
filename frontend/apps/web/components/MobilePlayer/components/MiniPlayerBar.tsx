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
            className="fixed inset-x-0 z-40 h-14 bg-black/80 shadow-lg"
            style={{
                height: MINI_PLAYER_HEIGHT,
                bottom: "calc(56px + env(safe-area-inset-bottom, 0px) + 12px)",
            }}
        >
            <div
                className={`absolute top-0 left-0 h-full w-0.75 transition-colors ${
                    isPlaying
                        ? "bg-(--color-rockit-pink)"
                        : "bg-transparent"
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
                        className="h-full w-full rounded bg-(--color-surface) object-cover"
                    />
                </div>

                <div className="min-w-0 flex-1">
                    <p className="truncate text-base font-semibold text-white">
                        {currentMedia.name}
                    </p>
                    <p className="truncate text-sm text-(--color-muted)">
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
                        <Pause size={22} className="fill-current text-white" />
                    ) : (
                        <Play size={22} className="fill-current text-white" />
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
                    <SkipForward
                        size={22}
                        className="fill-current text-white"
                    />
                </span>
            </button>

            {/* Progress hint */}
            <div className="absolute inset-x-0 bottom-0 h-0.5 bg-white/10">
                <div
                    className="h-full bg-linear-to-r from-(--color-rockit-pink) via-(--color-rockit-pink-mid) to-(--color-rockit-pink-light) transition-[width] duration-300"
                    style={{ width: `${progressPercent}%` }}
                />
            </div>
        </div>
    );
}
