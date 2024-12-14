import { volume } from "@/stores/audio";
import { useStore } from "@nanostores/react";
import { Volume1, Volume2, VolumeOff } from "lucide-react";
import Slider from "./Slider";

export default function VolumeSlider() {
    const $volume = useStore(volume);

    let volumeIcon;
    if ($volume == 0) {
        volumeIcon = (
            <VolumeOff className="w-5 h-5 text-gray-400 md:hover:text-white cursor-pointer" />
        );
    } else if ($volume < 0.3) {
        volumeIcon = (
            <Volume1 className="w-5 h-5 text-gray-400 md:hover:text-white cursor-pointer" />
        );
    } else {
        volumeIcon = (
            <Volume2 className="w-5 h-5 text-gray-400 md:hover:text-white cursor-pointer" />
        );
    }

    return (
        <div className="flex flex-row items-center gap-x-2 h-full">
            {volumeIcon}

            <Slider
                className="w-16 h-6"
                value={Math.sqrt($volume)}
                min={0}
                max={1}
                step={0.001}
                onChange={(event) =>
                    volume.set(Number(event.target.value) ** 2)
                }
            />

            {/* <div className="relative w-16 h-1 rounded-full bg-gray-700">
                <div
                    className="absolute top-0 left-0 h-full rounded-full bg-gradient-to-r from-[#ee1086] to-[#fb6467]"
                    style={{ width: `${Math.sqrt($volume) * 100}%` }}
                ></div>
                <Input
                    value={Math.sqrt($volume)}
                    onChange={(event) =>
                        volume.set(Number(event.target.value) ** 2)
                    }
                    type="range"
                    min={0}
                    max={1}
                    step={0.01}
                />
            </div> */}
        </div>
    );
}
