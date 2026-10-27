"use client";

import type { JSX } from "react";
import { useStore } from "@nanostores/react";
import { Volume1, Volume2, VolumeOff } from "lucide-react";
import { rockIt } from "@/lib/rockit/rockIt";
import Slider from "@/components/Slider/Slider";

function VolumeIcon({ volume }: { volume: number }): JSX.Element {
    const className =
        "h-5.5 w-5.5 cursor-pointer text-gray-400 md:hover:text-white";
    const onClick = (): void => rockIt.mediaPlayerManager.toggleMute();

    if (volume === 0)
        return <VolumeOff className={className} onClick={onClick} />;
    if (volume < 0.5)
        return <Volume1 className={className} onClick={onClick} />;
    return <Volume2 className={className} onClick={onClick} />;
}

export default function VolumeSlider(): JSX.Element {
    const $volume = useStore(rockIt.mediaPlayerManager.volumeAtom);
    const volume = $volume ?? 0;

    return (
        <div className="flex h-full flex-row items-center gap-x-2">
            <VolumeIcon volume={volume} />
            <Slider
                id="default-slider"
                className="h-1 w-28 bg-neutral-700"
                value={Math.sqrt(volume)}
                min={0}
                max={1}
                step={0.001}
                onChange={(e): void => {
                    rockIt.mediaPlayerManager.volume =
                        Number(e.target.value) ** 2;
                }}
            />
        </div>
    );
}
