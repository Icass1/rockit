"use client";

import type { JSX } from "react";
import { useState } from "react";
import { useStore } from "@nanostores/react";
import { BOOKMARK_MODE_COLORS } from "@/lib/managers/bookmarkManager";
import { usePlayerTime } from "@/lib/PlayerContext";
import { rockIt } from "@/lib/rockit/rockIt";
import { formatTime } from "@/components/MobilePlayer/utils/format";
import Slider from "@/components/Slider/Slider";

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
    const max = duration > 0 ? duration : 1;

    return (
        <div className="w-full px-1">
            <div className="relative flex h-8 items-center">
                <Slider
                    id="default-slider"
                    className="h-1.75 w-full rounded-full bg-white/10"
                    value={displayTime}
                    min={0}
                    max={max}
                    step={0.1}
                    onPointerDown={() => setIsSeeking(true)}
                    onChange={(e) => setSeekValue(Number(e.target.value))}
                    onPointerUp={(e) => {
                        setIsSeeking(false);
                        onSeek(Number((e.target as HTMLInputElement).value));
                    }}
                />

                {duration > 0 &&
                    $bookmarks.map((bm) => (
                        <div
                            key={bm.publicId}
                            className="pointer-events-none absolute top-1/2 h-2.75 w-1 -translate-y-1/2 rounded-sm"
                            style={{
                                left: `${(bm.timestamp / duration) * 100}%`,
                                backgroundColor:
                                    BOOKMARK_MODE_COLORS[bm.mode] ?? "#ffffff",
                            }}
                        />
                    ))}
            </div>

            <div className="-mt-2 flex justify-between px-1">
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
