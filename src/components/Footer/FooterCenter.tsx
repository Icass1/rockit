import { getTime } from "@/lib/getTime";

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

import {
    currentSong,
    currentTime,
    loading,
    next,
    pause,
    play,
    playing,
    prev,
    randomQueue,
    repeatSong,
    setTime,
    currentStation,
} from "@/stores/audio";

export function cyclerepeatSong() {
    repeatSong.set(
        repeatSong.get() === "off"
            ? "all"
            : repeatSong.get() === "all"
              ? "one"
              : "off"
    );
}

export default function FooterCenter() {
    const $playing = useStore(playing);
    const $currentTime = useStore(currentTime);
    const $currentSong = useStore(currentSong);
    const $randomQueue = useStore(randomQueue);
    const $repeatSong = useStore(repeatSong);
    const $loading = useStore(loading);
    const $currentStation = useStore(currentStation);

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
                            onClick={() => randomQueue.set(!randomQueue.get())}
                        />
                        <SkipBack
                            className={
                                "h-[22px] w-[22px] cursor-pointer fill-current text-gray-400 md:hover:scale-105 md:hover:text-white"
                            }
                            onClick={async () => {
                                await prev();
                                play();
                            }}
                        />

                        {$loading ? (
                            <Spinner></Spinner>
                        ) : $playing ? (
                            <CirclePause
                                className="h-8 w-8 cursor-pointer text-gray-400 md:hover:scale-105 md:hover:text-white"
                                onClick={() => pause()}
                            />
                        ) : (
                            <CirclePlay
                                className="h-8 w-8 cursor-pointer text-gray-400 md:hover:scale-105 md:hover:text-white"
                                onClick={() => play()}
                            />
                        )}

                        <SkipForward
                            className={
                                "h-[22px] w-[22px] cursor-pointer fill-current text-gray-400 md:hover:scale-105 md:hover:text-white"
                            }
                            onClick={async () => {
                                await next();
                                play();
                            }}
                        />
                        {$repeatSong === "one" ? (
                            <Repeat1
                                className={
                                    "h-[18px] w-[18px] cursor-pointer transition-colors md:hover:scale-105 " +
                                    "text-[#ee1086]"
                                }
                                onClick={cyclerepeatSong}
                            />
                        ) : (
                            <Repeat
                                className={
                                    "h-[18px] w-[18px] cursor-pointer transition-colors md:hover:scale-105 " +
                                    ($repeatSong === "all"
                                        ? "text-[#ee1086]"
                                        : "text-gray-400")
                                }
                                onClick={cyclerepeatSong}
                            />
                        )}
                    </div>
                    <div className="group flex h-7 w-full items-center space-x-2">
                        <span
                            id="current-time"
                            className="min-w-6 text-xs font-semibold"
                        >
                            {getTime($currentTime || 0)}
                        </span>

                        <Slider
                            id="default-slider"
                            className="group relative h-1 w-full max-w-full min-w-0 rounded bg-neutral-700"
                            value={$currentTime ?? 0}
                            min={0}
                            max={$currentSong?.duration}
                            step={0.001}
                            onChange={(event) => {
                                setTime(Number(event.target.value));
                            }}
                        />

                        <span
                            id="total-time"
                            className="min-w-6 text-xs font-semibold"
                        >
                            {getTime($currentSong?.duration || 0)}
                        </span>
                    </div>
                </>
            )}
        </div>
    );
}
