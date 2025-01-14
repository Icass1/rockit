import { getTime } from "@/lib/getTime";
import {
    currentSong,
    currentTime,
    next,
    pause,
    play,
    playing,
    prev,
    randomQueue,
    setTime,
} from "@/stores/audio";
import { useStore } from "@nanostores/react";
import {
    Shuffle,
    SkipBack,
    SkipForward,
    CirclePlay,
    Repeat,
    CirclePause,
} from "lucide-react";
import Slider from "./Slider";

export default function FooterCenter() {
    const $playing = useStore(playing);
    const $currentTime = useStore(currentTime);
    const $currentSong = useStore(currentSong);
    const $randomQueue = useStore(randomQueue);

    return (
        <div
            className="hidden flex-col items-center justify-center w-1/3 space-y-1 md:flex"
            id="footer-center"
        >
            <div className="grid grid-cols-5 justify-items-center items-center gap-2">
                <Shuffle
                    className={
                        "w-[18px] h-[18px]  cursor-pointer md:hover:scale-105 transition-colors" +
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
                {$playing ? (
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
                <Repeat className="w-5 h-5 text-gray-400 md:hover:text-white cursor-pointer md:hover:scale-105" />
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
