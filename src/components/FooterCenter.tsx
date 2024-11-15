import { currentSong, currentTime, getTime, pause, play, playing, totalTime } from "@/stores/audio";
import { useStore } from "@nanostores/react";
import {
    Shuffle,
    SkipBack,
    SkipForward,
    CirclePlay,
    Repeat,
    CirclePause,
} from "lucide-react";



export default function FooterCenter() {
    const $playing = useStore(playing)
    const $totalTime = useStore(totalTime)
    const $currentTime = useStore(currentTime)

    const handleMouseUp = (event: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
        if (!$totalTime) {
            return
        }
        const boundaries = (event.target as HTMLDivElement).getBoundingClientRect()
        const newTime = (event.clientX - boundaries.x) / boundaries.width * $totalTime
    }


    return (
        <div className="flex flex-col items-center justify-center w-1/3 space-y-1">
            <div className="grid grid-cols-5 justify-items-center items-center gap-2">
            <Shuffle
                    className="w-[18px] h-[18px] text-gray-400 hover:text-white cursor-pointer"
                />
                <SkipBack
                    className="w-[22px] h-[22px] fill-current text-gray-400 hover:text-white cursor-pointer"
                />
                {$playing ?
                    <CirclePause
                        className="w-8 h-8 text-gray-400 hover:text-white cursor-pointer"
                        onClick={pause}
                    /> :
                    <CirclePlay
                        className="w-8 h-8 text-gray-400 hover:text-white cursor-pointer"
                        onClick={play}
                    />
                }
                <SkipForward
                    className="w-[22px] h-[22px] fill-current text-gray-400 hover:text-white cursor-pointer"
                />
                <Repeat
                    className="w-5 h-5 text-gray-400 hover:text-white cursor-pointer"
                />
            </div>
            <div className="flex items-center space-x-2 h-7 w-full group">
                <span id="current-time" className="text-xs">{getTime($currentTime || 0)}</span>
                <div
                    className="w-full relative min-w-0 max-w-full rounded h-1 bg-gray-700 group"
                    onMouseUp={handleMouseUp}
                    >
                    {$currentTime != undefined && $totalTime != undefined ? (
                        <div
                        className="absolute top-0 left-0 h-1 bg-gradient-to-r from-[#ee1086] to-[#fb6467] rounded"
                        style={{ width: `${($currentTime / $totalTime) * 100}%` }}
                        />
                    ) : (
                        <></>
                    )}
                    <div className="absolute top-1/2 -translate-y-1/2 left-0 w-3 h-3 bg-white rounded-full opacity-0 group-hover:opacity-100 group-hover:cursor-pointer"></div>
                </div>

                <span id="total-time" className="text-xs">{getTime($totalTime || 0)}</span>
            </div>
        </div>
    )
}