import { getTime } from "@/lib/getTime";
import Slider from "./Slider";
import { useStore } from "@nanostores/react";
import {
    currentTime,
    next,
    pause,
    play,
    playing,
    setTime,
    totalTime,
} from "@/stores/audio";

export default function FooterMobileBar() {
    const $totalTime = useStore(totalTime);
    const $currentTime = useStore(currentTime);
    return (
        <div className="flex items-center space-x-2 pt-1 w-full group">
            <Slider
                id="default-slider"
                className="w-full relative min-w-0 max-w-full rounded h-1 bg-gray-700 group"
                value={$currentTime ?? 0}
                min={0}
                max={$totalTime}
                step={0.001}
                onChange={(event) => {
                    setTime(Number(event.target.value));
                }}
            />
        </div>
    );
}
