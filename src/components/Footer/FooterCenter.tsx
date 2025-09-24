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
import { rockitIt } from "@/lib/rockit";

export default function FooterCenter() {
    const $playing = useStore(rockitIt.audioManager.playingAtom);
    const $currentTime = useStore(rockitIt.audioManager.currentTimeAtom);
    const $loading = useStore(rockitIt.audioManager.loadingAtom);
    const $currentSong = useStore(rockitIt.queueManager.currentSongAtom);
    const $randomQueue = useStore(rockitIt.userManager.randomQueueAtom);
    const $repeatSong = useStore(rockitIt.userManager.repeatSongAtom);
    const $currentStation = useStore(
        rockitIt.stationManager.currentStationAtom
    );
    // const $crossFadeCurrentTime = useStore(rockitIt.userManager.crossFadeCurrentTimeAtom);
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
                            onClick={rockitIt.userManager.toggleRandomQueue}
                        />
                        <SkipBack
                            className={
                                "h-[22px] w-[22px] cursor-pointer fill-current text-gray-400 md:hover:scale-105 md:hover:text-white"
                            }
                            onClick={rockitIt.audioManager.skipBack}
                        />

                        {$loading ? (
                            <Spinner></Spinner>
                        ) : $playing ? (
                            <CirclePause
                                className="h-8 w-8 cursor-pointer text-gray-400 md:hover:scale-105 md:hover:text-white"
                                onClick={rockitIt.audioManager.pause}
                            />
                        ) : (
                            <CirclePlay
                                className="h-8 w-8 cursor-pointer text-gray-400 md:hover:scale-105 md:hover:text-white"
                                onClick={rockitIt.audioManager.play}
                            />
                        )}

                        <SkipForward
                            className={
                                "h-[22px] w-[22px] cursor-pointer fill-current text-gray-400 md:hover:scale-105 md:hover:text-white"
                            }
                            onClick={rockitIt.audioManager.skipForward}
                        />
                        {$repeatSong === "one" ? (
                            <Repeat1
                                className={
                                    "h-[18px] w-[18px] cursor-pointer transition-colors md:hover:scale-105 " +
                                    "text-[#ee1086]"
                                }
                                onClick={rockitIt.userManager.cyclerepeatSong}
                            />
                        ) : (
                            <Repeat
                                className={
                                    "h-[18px] w-[18px] cursor-pointer transition-colors md:hover:scale-105 " +
                                    ($repeatSong === "all"
                                        ? "text-[#ee1086]"
                                        : "text-gray-400")
                                }
                                onClick={rockitIt.userManager.cyclerepeatSong}
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
                                        rockitIt.audioManager.setCurrentTime(
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
                                    rockitIt.audioManager.setCurrentTime(
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
