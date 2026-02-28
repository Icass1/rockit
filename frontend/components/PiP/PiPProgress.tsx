"use client";

import { useStore } from "@nanostores/react";
import { rockIt } from "@/lib/rockit/rockIt";
import { getTime } from "@/lib/utils/getTime";

const S = {
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
};

interface PiPProgressProps {
    show: boolean;
}

export function PiPProgress({ show }: PiPProgressProps) {
    const $currentTime = useStore(rockIt.audioManager.currentTimeAtom);
    const $currentSong = useStore(rockIt.queueManager.currentSongAtom);

    const progress =
        (($currentTime ?? 0) / ($currentSong?.duration ?? 1)) * 100;

    if (!show) return null;

    return (
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
                    rockIt.audioManager.setCurrentTime(Number(e.target.value))
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
    );
}
