import { useStore } from "@nanostores/react";
import { Volume1, Volume2, VolumeOff } from "lucide-react";
import Slider from "@/components/Slider";
import { rockIt } from "@/lib/rockit/rockIt";

export default function VolumeSlider() {
    const $volume = useStore(rockIt.audioManager.volumeAtom);

    let volumeIcon;
    if ($volume === 0) {
        volumeIcon = (
            <VolumeOff
                className="h-[22px] w-[22px] cursor-pointer text-gray-400 md:hover:text-white"
                onClick={() => rockIt.audioManager.toggleMute()}
            />
        );
    } else if ($volume && $volume < 0.5) {
        volumeIcon = (
            <Volume1
                className="h-[22px] w-[22px] cursor-pointer text-gray-400 md:hover:text-white"
                onClick={() => rockIt.audioManager.toggleMute()}
            />
        );
    } else {
        volumeIcon = (
            <Volume2
                className="h-[22px] w-[22px] cursor-pointer text-gray-400 md:hover:text-white"
                onClick={() => rockIt.audioManager.toggleMute()}
            />
        );
    }

    return (
        <div className="flex h-full flex-row items-center gap-x-2">
            {volumeIcon}

            <Slider
                id="default-slider"
                className="h-1 w-16 bg-neutral-700"
                value={Math.sqrt($volume || 0)}
                min={0}
                max={1}
                step={0.001}
                onChange={(event) =>
                    (rockIt.audioManager.volume =
                        Number(event.target.value) ** 2)
                }
            />
        </div>
    );
}
