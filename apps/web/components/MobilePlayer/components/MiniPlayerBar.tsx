"use client";

import type { JSX } from "react";
import { getMediaArtistsString } from "@rockit/shared";
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
            className="bg-secondary/95 fixed inset-x-0 z-40 h-14 shadow-lg"
            style={{
                height: MINI_PLAYER_HEIGHT,
                bottom: "calc(56px + env(safe-area-inset-bottom, 0px) + 12px)",
            }}
        >
            <div
                className={`absolute top-0 left-0 h-full w-0.75 transition-colors ${
                    isPlaying ? "bg-primary" : "bg-transparent"
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
                    <p className="text-foreground-strong truncate text-base font-semibold">
                        {currentMedia.name}
                    </p>
                    <p className="text-muted-foreground truncate text-sm">
                        {getMediaArtistsString(currentMedia)}
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
                        <span className="border-foreground-strong/30 border-t-foreground-strong h-5 w-5 animate-spin rounded-full border-2" />
                    ) : isPlaying ? (
                        <Pause
                            size={22}
                            className="text-foreground-strong fill-current"
                        />
                    ) : (
                        <Play
                            size={22}
                            className="text-foreground-strong fill-current"
                        />
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
                        className="text-foreground-strong fill-current"
                    />
                </span>
            </button>

            {/* Progress hint */}
            <div className="bg-foreground-strong/10 absolute inset-x-0 bottom-0 h-0.5">
                <div
                    className="from-primary via-brand-mid to-brand-light h-full bg-linear-to-r transition-[width] duration-300"
                    style={{ width: `${progressPercent}%` }}
                />
            </div>
        </div>
    );
}
