import Slider from "../Slider";
import { useStore } from "@nanostores/react";
import { currentSong, currentTime, setTime } from "@/stores/audio";

export default function FooterMobileBar() {
    const $currentTime = useStore(currentTime);
    const $currentSong = useStore(currentSong);

    return (
        <div className="flex items-center space-x-2 pt-1 w-full group">
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
        </div>
    );
}
