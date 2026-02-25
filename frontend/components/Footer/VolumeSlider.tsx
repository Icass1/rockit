"use client";

import { rockIt } from "@/lib/rockit/rockIt";
import Slider from "@/components/Slider";
import { useStore } from "@nanostores/react";
import { Volume1, Volume2, VolumeOff } from "lucide-react";

function VolumeIcon({ volume }: { volume: number }) {
    const className =
        "h-5.5 w-5.5 cursor-pointer text-gray-400 md:hover:text-white";
    const onClick = () => rockIt.audioManager.toggleMute();

    if (volume === 0)
        return <VolumeOff className={className} onClick={onClick} />;
    if (volume < 0.5)
        return <Volume1 className={className} onClick={onClick} />;
    return <Volume2 className={className} onClick={onClick} />;
}

export default function VolumeSlider() {
    const $volume = useStore(rockIt.audioManager.volumeAtom);
    const volume = $volume ?? 0;

    return (
        <div className="flex h-full flex-row items-center gap-x-2">
            <VolumeIcon volume={volume} />
            <Slider
                id="default-slider"
                className="h-1 w-16 bg-neutral-700"
                value={Math.sqrt(volume)}
                min={0}
                max={1}
                step={0.001}
                onChange={(e) => {
                    rockIt.audioManager.volume = Number(e.target.value) ** 2;
                }}
            />
        </div>
    );
}
