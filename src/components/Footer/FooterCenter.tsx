import { getTime } from "@/lib/utils/getTime";

import { useStore } from "@nanostores/react";
import {
    Shuffle,
    SkipBack,
    SkipForward,
    CirclePlay,
    Repeat,
    CirclePause,
    Repeat1,
} from "lucide-react";
import Slider from "@/components/Slider";
import Spinner from "@/components/Spinner";
import { rockIt } from "@/lib/rockit/rockIt";

export default function FooterCenter() {
    const $playing = useStore(rockIt.audioManager.playingAtom);
    const $currentTime = useStore(rockIt.audioManager.currentTimeAtom);
    const $loading = useStore(rockIt.audioManager.loadingAtom);
    const $currentSong = useStore(rockIt.queueManager.currentSongAtom);
    const $randomQueue = useStore(rockIt.userManager.randomQueueAtom);
    const $repeatSong = useStore(rockIt.userManager.repeatSongAtom);
    const $currentStation = useStore(rockIt.stationManager.currentStationAtom);
    // const $crossFadeCurrentTime = useStore(rockIt.userManager.crossFadeCurrentTimeAtom);
    // const $crossFade = useStore(crossFade);

    const $crossFadeCurrentTime = 0;
    const $crossFade = 0;

    return (
        <div className="hidden w-1/3 flex-col items-center justify-center space-y-1 md:flex">
            {!$currentStation && (
                <>
                    <div
                        className={
                            "grid grid-cols-5 items-center justify-items-center gap-2"
                        }
                    >
                        <Shuffle
                            className={
                                "h-[18px] w-[18px] cursor-pointer transition-colors md:hover:scale-105" +
                                ($randomQueue
                                    ? " text-[#ee1086]"
                                    : " text-gray-400")
                            }
                            onClick={() =>
                                rockIt.userManager.toggleRandomQueue()
                            }
                        />
                        <SkipBack
                            className={
                                "h-[22px] w-[22px] cursor-pointer fill-current text-gray-400 md:hover:scale-105 md:hover:text-white"
                            }
                            onClick={() => rockIt.queueManager.skipBack()}
                        />

                        {$loading ? (
                            <Spinner></Spinner>
                        ) : $playing ? (
                            <CirclePause
                                className="h-8 w-8 cursor-pointer text-gray-400 md:hover:scale-105 md:hover:text-white"
                                onClick={() => rockIt.audioManager.pause()}
                            />
                        ) : (
                            <CirclePlay
                                className="h-8 w-8 cursor-pointer text-gray-400 md:hover:scale-105 md:hover:text-white"
                                onClick={() => rockIt.audioManager.play()}
                            />
                        )}

                        <SkipForward
                            className={
                                "h-[22px] w-[22px] cursor-pointer fill-current text-gray-400 md:hover:scale-105 md:hover:text-white"
                            }
                            onClick={() => rockIt.queueManager.skipForward()}
                        />
                        {$repeatSong === "one" ? (
                            <Repeat1
                                className={
                                    "h-[18px] w-[18px] cursor-pointer transition-colors md:hover:scale-105 " +
                                    "text-[#ee1086]"
                                }
                                onClick={() =>
                                    rockIt.userManager.cyclerepeatSong()
                                }
                            />
                        ) : (
                            <Repeat
                                className={
                                    "h-[18px] w-[18px] cursor-pointer transition-colors md:hover:scale-105 " +
                                    ($repeatSong === "all"
                                        ? "text-[#ee1086]"
                                        : "text-gray-400")
                                }
                                onClick={() =>
                                    rockIt.userManager.cyclerepeatSong()
                                }
                            />
                        )}
                    </div>
                    <div className="flex h-7 w-full items-center space-x-2">
                        <span
                            id="current-time"
                            className="min-w-6 text-xs font-semibold"
                        >
                            {$crossFadeCurrentTime && $crossFade
                                ? getTime($crossFadeCurrentTime)
                                : getTime($currentTime || 0)}
                        </span>

                        {$crossFadeCurrentTime && $crossFade ? (
                            <Slider
                                id="default-slider"
                                className="relative h-1 w-full max-w-full min-w-0 rounded bg-neutral-700"
                                barClassName="bg-gradient-to-r from-[#ee1086] to-[#20d2fa] transition-[width] duration-500"
                                value={$crossFadeCurrentTime}
                                min={0}
                                max={$crossFade}
                                step={0.001}
                                onChange={(event) => {
                                    if ($currentSong)
                                        rockIt.audioManager.setCurrentTime(
                                            $currentSong?.duration -
                                                $crossFade +
                                                Number(event.target.value)
                                        );
                                }}
                            />
                        ) : (
                            <Slider
                                id="default-slider"
                                className="relative h-1 w-full max-w-full min-w-0 rounded bg-neutral-700"
                                value={$currentTime ?? 0}
                                min={0}
                                max={$currentSong?.duration}
                                step={0.001}
                                onChange={(event) => {
                                    rockIt.audioManager.setCurrentTime(
                                        Number(event.target.value)
                                    );
                                }}
                            />
                        )}

                        <span
                            id="total-time"
                            className="min-w-6 text-xs font-semibold"
                        >
                            {$crossFadeCurrentTime && $crossFade
                                ? getTime($crossFade)
                                : getTime($currentSong?.duration || 0)}
                        </span>
                    </div>
                </>
            )}
        </div>
    );
}
