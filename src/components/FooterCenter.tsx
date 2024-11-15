import {
    Shuffle,
    SkipBack,
    SkipForward,
    CirclePlay,
    Repeat,
} from "lucide-react";

import { audio } from "@/stores/audio";

export default function () {
    return (
        <div className="flex flex-col items-center justify-center w-1/3 space-y-1">
            <div className="flex items-center space-x-3">
                <Shuffle
                    className="w-4 h-4 text-gray-400 hover:text-white cursor-pointer"
                />
                <SkipBack
                    className="w-5 h-5 fill-current text-gray-400 hover:text-white cursor-pointer"
                />
                <CirclePlay
                    className="w-8 h-8 text-gray-400 hover:text-white cursor-pointer"
                />
                <SkipForward
                    className="w-5 h-5 fill-current text-gray-400 hover:text-white cursor-pointer"
                />
                <Repeat
                    className="w-5 h-5 text-gray-400 hover:text-white cursor-pointer"
                />
            </div>
            <div className="flex items-center space-x-2">
                <span id="current-time" className="text-xs">0:00</span>
                <div className="relative w-4/5 h-1 bg-gray-400">
                    <div
                        className="absolute top-0 left-0 h-20px bg-green-500 w-[40%]"
                    >
                    </div>
                </div>
                <span id="total-time" className="text-xs">0:00</span>
            </div>
        </div>
    )
}