"use client";

import type { JSX } from "react";
import { useStore } from "@nanostores/react";
import { getMediaDuration } from "@/models/types/media";
import { rockIt } from "@/lib/rockit/rockIt";
import { getTime } from "@/lib/utils/getTime";
import type { PiPLayout } from "@/components/PiP/PiPRoot";

interface PiPProgressProps {
    show: boolean;
    layout: PiPLayout;
}

export function PiPProgress({
    show,
    layout,
}: PiPProgressProps): JSX.Element | null {
    const $currentTime = useStore(rockIt.mediaPlayerManager.currentTimeAtom);
    const $currentSong = useStore(rockIt.queueManager.currentMediaAtom);

    const duration = getMediaDuration($currentSong) ?? 0;

    if (!show) return null;

    const isCoverOnly = layout === "cover-only";
    const progressPct =
        duration > 0
            ? Math.min(100, Math.max(0, (($currentTime ?? 0) / duration) * 100))
            : 0;
    const sliderStyle: React.CSSProperties = {
        flexGrow: 1,
        background: `linear-gradient(to right, #f53a76 ${progressPct}%, rgba(255,255,255,0.15) ${progressPct}%)`,
    };

    return (
        <div
            className="pip-progress-bar"
            style={{
                height: isCoverOnly ? "1rem" : "1.5rem",
                gap: isCoverOnly ? "4px" : "8px",
            }}
        >
            <span className="pip-time-label">{getTime($currentTime ?? 0)}</span>

            <input
                type="range"
                className="pip-slider"
                value={$currentTime ?? 0}
                min={0}
                max={duration}
                step={0.001}
                style={sliderStyle}
                onChange={(e): void => {
                    rockIt.mediaPlayerManager.setCurrentTime(
                        Number(e.target.value),
                        false
                    );
                }}
                onPointerDown={(): void => {
                    rockIt.mediaPlayerManager.beginSeek();
                }}
                onPointerUp={(e): void => {
                    rockIt.mediaPlayerManager.endSeek(
                        Number(e.currentTarget.value)
                    );
                }}
            />

            <span className="pip-time-label">{getTime(duration)}</span>
        </div>
    );
}
