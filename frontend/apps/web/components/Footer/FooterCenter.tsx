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
import { getMediaDuration } from "@/types/media";
import { rockIt } from "@/lib/rockit/rockIt";
import { getTime } from "@/lib/utils/getTime";

const ICON_BTN =
    "cursor-pointer text-gray-400 transition-all md:hover:scale-105 md:hover:text-white";
const ACTIVE = "text-[#ee1086]";

export default function FooterCenter() {
    const $playing = useStore(rockIt.audioManager.playingAtom);
    const $currentTime = useStore(rockIt.audioManager.currentTimeAtom);
    const $loading = useStore(rockIt.audioManager.loadingAtom);
    const $currentMedia = useStore(rockIt.queueManager.currentMediaAtom);
    const $queueType = useStore(rockIt.userManager.queueTypeAtom);
    const $repeatSong = useStore(rockIt.userManager.repeatModeAtom);
    const $currentStation = useStore(rockIt.stationManager.currentStationAtom);

    if ($currentStation) return <div className="hidden w-1/3 md:block" />;

    const RepeatIcon = $repeatSong === "ONE" ? Repeat1 : Repeat;
    const isRepeatActive = $repeatSong === "ONE" || $repeatSong === "ALL";

    const repeatLabel =
        $repeatSong === "ONE"
            ? "Repeat one"
            : $repeatSong === "ALL"
              ? "Repeat all"
              : "No repeat";

    return (
        <div className="hidden w-1/3 flex-col items-center justify-center space-y-1 md:flex">
            <div className="grid grid-cols-5 items-center justify-items-center gap-2">
                <button
                    aria-label={
                        $queueType ? "Disable shuffle" : "Enable shuffle"
                    }
                    aria-pressed={$queueType === "RANDOM"}
                    onClick={() => rockIt.userManager.toggleRandomQueue()}
                >
                    <Shuffle
                        className={`h-4.5 w-4.5 transition-colors md:hover:scale-105 ${$queueType === "RANDOM" ? ACTIVE : "text-gray-400"}`}
                    />
                </button>

                <button
                    aria-label="Previous song"
                    onClick={() => rockIt.queueManager.skipBack()}
                >
                    <SkipBack
                        className={`h-5.5 w-5.5 fill-current ${ICON_BTN}`}
                    />
                </button>

                {$loading ? (
                    <CirclePlay className="h-8 w-8 animate-pulse text-gray-400" />
                ) : (
                    <button
                        aria-label={$playing ? "Pause" : "Play"}
                        onClick={() =>
                            $playing
                                ? rockIt.audioManager.pause()
                                : rockIt.audioManager.play()
                        }
                    >
                        {$playing ? (
                            <CirclePause className={`h-8 w-8 ${ICON_BTN}`} />
                        ) : (
                            <CirclePlay className={`h-8 w-8 ${ICON_BTN}`} />
                        )}
                    </button>
                )}

                <button
                    aria-label="Next song"
                    onClick={() => rockIt.queueManager.skipForward()}
                >
                    <SkipForward
                        className={`h-5.5 w-5.5 fill-current ${ICON_BTN}`}
                    />
                </button>

                <button
                    aria-label={repeatLabel}
                    aria-pressed={isRepeatActive}
                    onClick={() => rockIt.userManager.cycleRepeatMode()}
                >
                    <RepeatIcon
                        className={`h-4.5 w-4.5 transition-colors md:hover:scale-105 ${isRepeatActive ? ACTIVE : "text-gray-400"}`}
                    />
                </button>
            </div>

            {/* Progress bar */}
            <div className="flex h-7 w-full items-center space-x-2">
                <span className="min-w-6 text-xs font-semibold tabular-nums">
                    {getTime($currentTime ?? 0)}
                </span>
                <input
                    type="range"
                    id="default-slider"
                    aria-label="Song progress"
                    aria-valuetext={`${getTime($currentTime ?? 0)} of ${getTime(getMediaDuration($currentMedia) ?? 0)}`}
                    className="h-1 w-full rounded bg-neutral-700 accent-[#ee1086]"
                    value={$currentTime ?? 0}
                    min={0}
                    max={getMediaDuration($currentMedia)}
                    step={0.001}
                    onChange={(e) =>
                        rockIt.audioManager.setCurrentTime(
                            Number(e.target.value)
                        )
                    }
                />
                <span className="min-w-6 text-xs font-semibold tabular-nums">
                    {getTime(getMediaDuration($currentMedia) ?? 0)}
                </span>
            </div>
        </div>
    );
}
