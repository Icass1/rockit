import { JSX, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useStore } from "@nanostores/react";
import { isSong, isVideo, TPlayableMedia } from "@rockit/packages/shared";
import { Pause, Play } from "lucide-react";
import { rockIt } from "@/lib/rockit/rockIt";
import Artists from "@/components/Artists/Artists";

export default function PlayerUIMain({
    currentMedia,
}: {
    currentMedia: TPlayableMedia;
}): JSX.Element | undefined {
    const $playing = useStore(rockIt.mediaPlayerManager.playingAtom);
    const [showIcon, setShowIcon] = useState(false);
    const videoContainerRef = useRef<HTMLDivElement>(null);

    useEffect((): (() => void) | undefined => {
        if (!showIcon) return;
        const t = setTimeout((): void => setShowIcon(false), 800);
        return (): void => clearTimeout(t);
    }, [showIcon]);

    useEffect((): void => {
        if (videoContainerRef.current && isVideo(currentMedia)) {
            rockIt.mediaPlayerManager.attachVideoToContainer(
                videoContainerRef.current
            );
        }
    }, [currentMedia]);

    const handleClick = (): void => {
        setShowIcon(true);
        rockIt.mediaPlayerManager.togglePlayPauseOrSetMedia();
    };

    const iconOverlay = (
        <div
            className={
                "pointer-events-none absolute top-1/2 left-1/2 z-20 flex h-20 w-20 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 transition-opacity duration-500 " +
                (showIcon ? "opacity-100" : "opacity-0")
            }
        >
            {$playing ? (
                <Pause className="h-10 w-10" fill="white" stroke="white" />
            ) : (
                <Play className="h-10 w-10" fill="white" stroke="white" />
            )}
        </div>
    );

    if (isVideo(currentMedia)) {
        return (
            <div
                className="relative h-full max-h-full cursor-pointer items-center"
                onClick={handleClick}
            >
                <div
                    ref={videoContainerRef}
                    className="absolute top-0 h-full max-h-full w-full cursor-pointer items-center rounded-lg"
                />
                {iconOverlay}
                <div className="absolute right-0 bottom-0 left-0 z-10 flex flex-col p-4">
                    <label className="text-2xl font-bold">
                        {currentMedia.name}
                    </label>
                    <Artists
                        className="text-md w-fit text-left font-semibold"
                        artists={currentMedia.artists}
                    />
                </div>
            </div>
        );
    } else if (isSong(currentMedia)) {
        return (
            <div
                className="relative flex h-full w-full cursor-pointer items-center justify-center overflow-hidden"
                onClick={handleClick}
            >
                <Image
                    src={currentMedia.imageUrl}
                    fill
                    alt={currentMedia.name}
                    className="mask-[linear-gradient(to_bottom,rgba(0,0,0,1)_80%,rgba(0,0,0,0.05)_100%)] object-contain"
                />
                {iconOverlay}
                <div className="absolute right-0 bottom-0 left-0 z-10 flex flex-col p-4">
                    <label className="text-2xl font-bold">
                        {currentMedia.name}
                    </label>
                    <Artists
                        className="text-md w-fit text-left font-semibold"
                        artists={currentMedia.artists}
                    />
                </div>
            </div>
        );
    } else return undefined;
}
