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
            <div className="flex items-center space-x-3">
                <Shuffle
                    className="w-4 h-4 text-gray-400 hover:text-white cursor-pointer"
                />
                <SkipBack
                    className="w-5 h-5 fill-current text-gray-400 hover:text-white cursor-pointer"
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
                    className="w-5 h-5 fill-current text-gray-400 hover:text-white cursor-pointer"
                />
                <Repeat
                    className="w-5 h-5 text-gray-400 hover:text-white cursor-pointer"
                />
            </div>
            <div className="flex items-center space-x-2 w-full">
                <span id="current-time" className="text-xs">{getTime($currentTime || 0)}</span>
                <div className="w-full relative min-w-0 max-w-full rounded h-1 bg-gray-700" onMouseUp={handleMouseUp}>
                    {$currentTime != undefined && $totalTime != undefined ?
                        <div
                            className="absolute top-0 left-0 h-1 bg-white rounded"
                            style={{ width: `${$currentTime / $totalTime * 100}%` }}

                        />
                        : <></>
                    }
                </div>
                <span id="total-time" className="text-xs">{getTime($totalTime || 0)}</span>
            </div>
        </div>
    )
}