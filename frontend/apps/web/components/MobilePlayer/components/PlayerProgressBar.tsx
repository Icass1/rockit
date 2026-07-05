"use client";

import type { JSX } from "react";
import { useState } from "react";
import { useStore } from "@nanostores/react";
import { formatTime } from "@/components/MobilePlayer/utils/format";
import { usePlayerTime } from "@/lib/PlayerContext";
import { rockIt } from "@/lib/rockit/rockIt";
import { BOOKMARK_MODE_COLORS } from "@/lib/managers/bookmarkManager";

interface PlayerProgressBarProps {
    onSeek: (seconds: number) => void;
}

export default function PlayerProgressBar({
    onSeek,
}: PlayerProgressBarProps): JSX.Element {
    const { currentTime, duration } = usePlayerTime();
    const $bookmarks = useStore(
        rockIt.bookmarkManager.currentMediaBookmarksAtom
    );
    const [isSeeking, setIsSeeking] = useState(false);
    const [seekValue, setSeekValue] = useState(currentTime);

    const displayTime = isSeeking ? seekValue : currentTime;
    const progress = duration > 0 ? (displayTime / duration) * 100 : 0;

    return (
        <div className="w-full px-1">
            <div className="relative flex h-8 items-center">
                <div
                    className="pointer-events-none absolute inset-x-0 h-[7px] overflow-hidden rounded-full bg-white/10"
                    aria-hidden
                >
                    <div
                        className="h-full bg-gradient-to-r from-[var(--color-rockit-pink)] via-[var(--color-rockit-pink-mid)] to-[var(--color-rockit-pink-light)]"
                        style={{ width: `${progress}%` }}
                    />
                </div>

                <input
                    type="range"
                    min={0}
                    max={duration > 0 ? duration : 1}
                    step={0.1}
                    value={displayTime}
                    onChange={(e) => {
                        setIsSeeking(true);
                        setSeekValue(Number(e.target.value));
                    }}
                    onPointerUp={(e) => {
                        setIsSeeking(false);
                        onSeek(
                            Number((e.target as HTMLInputElement).value)
                        );
                    }}
                    className="range-scrub relative w-full appearance-none bg-transparent"
                    aria-label="Progreso de la canción"
                />

                {duration > 0 &&
                    $bookmarks.map((bm) => (
                        <div
                            key={bm.publicId}
                            className="pointer-events-none absolute top-1/2 h-[11px] w-1 -translate-y-1/2 rounded-sm"
                            style={{
                                left: `${(bm.timestamp / duration) * 100}%`,
                                backgroundColor:
                                    BOOKMARK_MODE_COLORS[bm.mode] ??
                                    "#ffffff",
                            }}
                        />
                    ))}
            </div>

            <div className="mt-[-8px] flex justify-between px-1">
                <span className="text-xs font-medium text-white/70">
                    {formatTime(displayTime)}
                </span>
                <span className="text-xs font-medium text-white/70">
                    {formatTime(duration)}
                </span>
            </div>
        </div>
    );
}
