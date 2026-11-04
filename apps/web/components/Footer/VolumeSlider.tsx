"use client";

import type { JSX } from "react";
import { Volume1, Volume2, VolumeOff } from "lucide-react";
import { usePlaybackStore } from "@/hooks/usePlaybackStore";
import { usePlaybackServices } from "@/components/providers/PlaybackProvider";
import { useInitialPlayback } from "@/components/providers/QueueProvider";
import Slider from "@/components/ui/Slider/Slider";

function VolumeIcon({ volume }: { volume: number }): JSX.Element {
    const { mediaPlayerManager } = usePlaybackServices();
    const className =
        "h-5.5 w-5.5 cursor-pointer text-gray-400 md:hover:text-white";
    const onClick = (): void => mediaPlayerManager.toggleMute();

    if (volume === 0)
        return <VolumeOff className={className} onClick={onClick} />;
    if (volume < 0.5)
        return <Volume1 className={className} onClick={onClick} />;
    return <Volume2 className={className} onClick={onClick} />;
}

export default function VolumeSlider(): JSX.Element {
    const { mediaPlayerManager } = usePlaybackServices();
    const { session } = useInitialPlayback();
    const $volume = usePlaybackStore(
        mediaPlayerManager.volumeAtom,
        session?.volume ?? 1
    );
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
                    mediaPlayerManager.setVolume(Number(e.target.value) ** 2);
                }}
            />
        </div>
    );
}
