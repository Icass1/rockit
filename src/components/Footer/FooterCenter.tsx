import { getTime } from "@/lib/getTime";

import { useStore } from "@nanostores/react";
import {
    Shuffle,
    SkipBack,
    SkipForward,
    CirclePlay,
    Repeat,
    CirclePause,
} from "lucide-react";
import Slider from "../Slider";
import Spinner from "../Spinner";

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
} from "@/stores/audio";
export default function FooterCenter() {
    const $playing = useStore(playing);
    const $currentTime = useStore(currentTime);
    const $currentSong = useStore(currentSong);
    const $randomQueue = useStore(randomQueue);
    const $repeatSong = useStore(repeatSong);
    const $loading = useStore(loading);

    return (
        <div className="hidden flex-col items-center justify-center w-1/3 space-y-1 md:flex">
            <div className="grid grid-cols-5 justify-items-center items-center gap-2">
                <Shuffle
                    className={
                        "w-[18px] h-[18px] cursor-pointer md:hover:scale-105 transition-colors" +
                        ($randomQueue ? " text-[#ee1086] " : " text-gray-400 ")
                    }
                    onClick={() => randomQueue.set(!randomQueue.get())}
                />
                <SkipBack
                    className="w-[22px] h-[22px] fill-current text-gray-400 md:hover:text-white cursor-pointer md:hover:scale-105"
                    onClick={async () => {
                        await prev();
                        play();
                    }}
                />

                {$loading ? (
                    <Spinner></Spinner>
                ) : $playing ? (
                    <CirclePause
                        className="w-8 h-8 text-gray-400 md:hover:text-white cursor-pointer md:hover:scale-105"
                        onClick={pause}
                    />
                ) : (
                    <CirclePlay
                        className="w-8 h-8 text-gray-400 md:hover:text-white cursor-pointer md:hover:scale-105"
                        onClick={play}
                    />
                )}

                <SkipForward
                    className="w-[22px] h-[22px] fill-current text-gray-400 md:hover:text-white cursor-pointer md:hover:scale-105"
                    onClick={async () => {
                        await next();
                        play();
                    }}
                />
                <Repeat
                    className={
                        "w-[18px] h-[18px] cursor-pointer md:hover:scale-105 transition-colors" +
                        ($repeatSong ? " text-[#ee1086] " : " text-gray-400 ")
                    }
                    onClick={() => repeatSong.set(!repeatSong.get())}
                />
            </div>
            <div className="flex items-center space-x-2 h-7 w-full group">
                <span
                    id="current-time"
                    className="text-xs font-semibold min-w-6"
                >
                    {getTime($currentTime || 0)}
                </span>

                <Slider
                    id="default-slider"
                    className="w-full relative min-w-0 max-w-full rounded h-1 bg-neutral-700 group"
                    value={$currentTime ?? 0}
                    min={0}
                    max={$currentSong?.duration}
                    step={0.001}
                    onChange={(event) => {
                        setTime(Number(event.target.value));
                    }}
                />

                <span id="total-time" className="text-xs font-semibold min-w-6">
                    {getTime($currentSong?.duration || 0)}
                </span>
            </div>
        </div>
    );
}
