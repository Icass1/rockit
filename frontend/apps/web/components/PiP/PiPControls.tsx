"use client";

import type { JSX } from "react";
import { useStore } from "@nanostores/react";
import {
    CirclePause,
    CirclePlay,
    Repeat,
    Repeat1,
    Shuffle,
    SkipBack,
    SkipForward,
    Subtitles,
} from "lucide-react";
import { ERepeatMode } from "@/models/enums/repeatMode";
import { rockIt } from "@/lib/rockit/rockIt";
import type { PiPLayout } from "@/components/PiP/PiPRoot";

interface PiPControlsProps {
    show: boolean;
    layout: PiPLayout;
    showLyrics?: boolean;
    onToggleLyrics?: () => void;
    isSong?: boolean;
}

export function PiPControls({
    show,
    layout,
    showLyrics = false,
    onToggleLyrics,
    isSong = false,
}: PiPControlsProps): JSX.Element | null {
    const $playing = useStore(rockIt.mediaPlayerManager.playingAtom);
    const $repeatMode = useStore(rockIt.userManager.repeatModeAtom);

    if (!show) return null;

    const showSecondary = layout !== "cover-only" && layout !== "pill";

    return (
        <div className="pip-controls-bar">
            {showSecondary && onToggleLyrics && isSong && (
                <div
                    className="pip-controls-icon-btn"
                    style={{ visibility: "hidden", pointerEvents: "none" }}
                >
                    <Subtitles className="pip-icon" />
                </div>
            )}

            {showSecondary && (
                <button
                    className="pip-controls-icon-btn"
                    onClick={(): void => rockIt.userManager.toggleRandomQueue()}
                    aria-label="Toggle shuffle"
                    title="Shuffle"
                >
                    <Shuffle className="pip-icon" />
                </button>
            )}

            <button
                className="pip-controls-icon-btn"
                onClick={(): void => rockIt.queueManager.skipBack()}
                aria-label="Previous"
                title="Previous"
            >
                <SkipBack className="pip-icon" fill="white" />
            </button>

            <button
                className="pip-controls-icon-btn"
                onClick={(): void =>
                    rockIt.mediaPlayerManager.togglePlayPauseOrSetMedia()
                }
                aria-label={$playing ? "Pause" : "Play"}
                title={$playing ? "Pause" : "Play"}
            >
                {$playing ? (
                    <CirclePause className="pip-play-icon" />
                ) : (
                    <CirclePlay className="pip-play-icon" />
                )}
            </button>

            <button
                className="pip-controls-icon-btn"
                onClick={(): void => rockIt.queueManager.skipForward()}
                aria-label="Next"
                title="Next"
            >
                <SkipForward className="pip-icon" fill="white" />
            </button>

            {showSecondary && (
                <button
                    className="pip-controls-icon-btn"
                    onClick={(): void => rockIt.userManager.cycleRepeatMode()}
                    aria-label={
                        $repeatMode === ERepeatMode.ONE
                            ? "Repeat one"
                            : $repeatMode === ERepeatMode.ALL
                              ? "Repeat all"
                              : "No repeat"
                    }
                    title={
                        $repeatMode === ERepeatMode.ONE
                            ? "Repeat one"
                            : $repeatMode === ERepeatMode.ALL
                              ? "Repeat all"
                              : "No repeat"
                    }
                >
                    {$repeatMode === ERepeatMode.ONE ? (
                        <Repeat1 className="pip-icon" />
                    ) : (
                        <Repeat className="pip-icon" />
                    )}
                </button>
            )}

            {showSecondary && onToggleLyrics && isSong && (
                <button
                    className={`pip-controls-icon-btn${showLyrics ? "pip-lyrics-toggle-btn--active" : ""}`}
                    onClick={onToggleLyrics}
                    aria-label={showLyrics ? "Hide lyrics" : "Show lyrics"}
                    title={showLyrics ? "Hide lyrics" : "Show lyrics"}
                >
                    <Subtitles className="pip-icon" />
                </button>
            )}
        </div>
    );
}
