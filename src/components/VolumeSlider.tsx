import { volume } from "@/stores/audio";
import { useStore } from "@nanostores/react";
import { Volume1, Volume2, VolumeOff } from "lucide-react";
import Slider from "./Slider";

export default function VolumeSlider() {
    const $volume = useStore(volume);

    let volumeIcon;
    if ($volume == 0) {
        volumeIcon = (
            <VolumeOff
                className="w-[22px] h-[22px] text-gray-400 md:hover:text-white cursor-pointer"
                onClick={() => {}}
            />
        );
    } else if ($volume < 0.5) {
        volumeIcon = (
            <Volume1
                className="w-[22px] h-[22px] text-gray-400 md:hover:text-white cursor-pointer"
                onClick={() => {}}
            />
        );
    } else {
        volumeIcon = (
            <Volume2
                className="w-[22px] h-[22px] text-gray-400 md:hover:text-white cursor-pointer"
                onClick={() => {}}
            />
        );
    }

    return (
        <div className="flex flex-row items-center gap-x-2 h-full">
            {volumeIcon}

            <Slider
                id="default-slider"
                className="w-16 h-6"
                value={Math.sqrt($volume)}
                min={0}
                max={1}
                step={0.001}
                onChange={(event) =>
                    volume.set(Number(event.target.value) ** 2)
                }
            />
        </div>
    );
}
