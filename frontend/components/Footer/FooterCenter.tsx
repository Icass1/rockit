"use client";

import { rockIt } from "@/lib/rockit/rockIt";
import { getTime } from "@/lib/utils/getTime";
import Slider from "@/components/Slider";
import Spinner from "@/components/Spinner";
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

const ICON_BTN =
    "cursor-pointer text-gray-400 transition-all md:hover:scale-105 md:hover:text-white";
const ACTIVE = "text-[#ee1086]";

export default function FooterCenter() {
    const $playing = useStore(rockIt.audioManager.playingAtom);
    const $currentTime = useStore(rockIt.audioManager.currentTimeAtom);
    const $loading = useStore(rockIt.audioManager.loadingAtom);
    const $currentSong = useStore(rockIt.queueManager.currentSongAtom);
    const $randomQueue = useStore(rockIt.userManager.randomQueueAtom);
    const $repeatSong = useStore(rockIt.userManager.repeatSongAtom);
    const $currentStation = useStore(rockIt.stationManager.currentStationAtom);

    if ($currentStation) return <div className="hidden w-1/3 md:block" />;

    const RepeatIcon = $repeatSong === "one" ? Repeat1 : Repeat;
    const isRepeatActive = $repeatSong === "one" || $repeatSong === "all";

    return (
        <div className="hidden w-1/3 flex-col items-center justify-center space-y-1 md:flex">
            {/* Controls */}
            <div className="grid grid-cols-5 items-center justify-items-center gap-2">
                <button
                    aria-label={
                        $randomQueue ? "Disable shuffle" : "Enable shuffle"
                    }
                    onClick={() => rockIt.userManager.toggleRandomQueue()}
                >
                    <Shuffle
                        className={`h-4.5 w-4.5 transition-colors md:hover:scale-105 ${$randomQueue ? ACTIVE : "text-gray-400"}`}
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
                    <Spinner />
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
                    aria-label={
                        $repeatSong === "one"
                            ? "Repeat one"
                            : $repeatSong === "all"
                              ? "Repeat all"
                              : "No repeat"
                    }
                    onClick={() => rockIt.userManager.cyclerepeatSong()}
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
                <Slider
                    id="default-slider"
                    className="relative h-1 w-full max-w-full min-w-0 rounded bg-neutral-700"
                    value={$currentTime ?? 0}
                    min={0}
                    max={$currentSong?.duration}
                    step={0.001}
                    onChange={(e) =>
                        rockIt.audioManager.setCurrentTime(
                            Number(e.target.value)
                        )
                    }
                />
                <span className="min-w-6 text-xs font-semibold tabular-nums">
                    {getTime($currentSong?.duration ?? 0)}
                </span>
            </div>
        </div>
    );
}
