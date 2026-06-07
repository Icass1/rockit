import { JSX, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useStore } from "@nanostores/react";
import { isSong, isStation, isVideo, TPlayableMedia } from "@rockit/packages/shared";
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
    const [titleVisible, setTitleVisible] = useState(true);
    const [songHover, setSongHover] = useState(false);
    const videoContainerRef = useRef<HTMLDivElement>(null);
    const hideTitleTimerRef = useRef<ReturnType<typeof setTimeout>>(null);

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

    useEffect((): (() => void) | undefined => {
        if (!isVideo(currentMedia)) return;
        const t = setTimeout((): void => setTitleVisible(false), 1000);
        return (): void => clearTimeout(t);
    }, [currentMedia]);

    const handleVideoMouseEnter = (): void => {
        if (hideTitleTimerRef.current) clearTimeout(hideTitleTimerRef.current);
        setTitleVisible(true);
    };

    const handleVideoMouseLeave = (): void => {
        hideTitleTimerRef.current = setTimeout(
            (): void => setTitleVisible(false),
            1500
        );
    };

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
                className="relative flex h-full w-full items-center justify-center"
                onMouseEnter={handleVideoMouseEnter}
                onMouseLeave={handleVideoMouseLeave}
            >
                <div
                    className="relative h-[90%] aspect-video max-w-full cursor-pointer overflow-hidden rounded-xl"
                    onClick={handleClick}
                >
                    <div
                        ref={videoContainerRef}
                        className="absolute inset-0"
                    />
                    {iconOverlay}
                    <div
                        className={`absolute right-0 bottom-0 left-0 z-10 flex flex-col bg-linear-to-t from-black/60 to-transparent pt-12 pr-5 pb-5 pl-5 transition-opacity duration-300 ${
                            titleVisible
                                ? "opacity-100"
                                : "pointer-events-none opacity-0"
                        }`}
                    >
                        <label className="truncate text-2xl font-bold">
                            {currentMedia.name}
                        </label>
                        <Artists
                            className="text-md w-fit flex-nowrap truncate text-left font-semibold"
                            artists={currentMedia.artists}
                        />
                    </div>
                </div>
            </div>
        );
    } else if (isSong(currentMedia)) {
        return (
            <div
                className="relative flex h-full w-full items-center justify-center"
                onMouseEnter={(): void => setSongHover(true)}
                onMouseLeave={(): void => setSongHover(false)}
            >
                <div
                    className="relative aspect-square h-[93%] cursor-pointer overflow-hidden rounded-xl"
                    onClick={handleClick}
                >
                    <Image
                        src={currentMedia.imageUrl}
                        fill
                        alt={currentMedia.name}
                        className="object-cover"
                    />
                    {iconOverlay}
                    <div
                        className={`absolute right-0 bottom-0 left-0 z-10 flex flex-col bg-linear-to-t from-black/60 to-transparent pt-12 pr-5 pb-5 pl-5 transition-opacity duration-300 ${
                            songHover
                                ? "opacity-100"
                                : "pointer-events-none opacity-0"
                        }`}
                    >
                        <label className="truncate text-2xl font-bold">
                            {currentMedia.name}
                        </label>
                        <Artists
                            className="text-md w-fit flex-nowrap truncate text-left font-semibold"
                            artists={currentMedia.artists}
                        />
                    </div>
                </div>
            </div>
        );
    } else if (isStation(currentMedia)) {
        return (
            <div
                className="relative flex h-full w-full items-center justify-center"
                onMouseEnter={(): void => setSongHover(true)}
                onMouseLeave={(): void => setSongHover(false)}
            >
                <div
                    className="relative aspect-square h-[93%] cursor-pointer overflow-hidden rounded-xl"
                    onClick={handleClick}
                >
                    <Image
                        src={currentMedia.imageUrl}
                        fill
                        alt={currentMedia.name}
                        className="object-cover"
                    />
                    {iconOverlay}
                    <div
                        className={`absolute right-0 bottom-0 left-0 z-10 flex flex-col bg-linear-to-t from-black/60 to-transparent pt-12 pr-5 pb-5 pl-5 transition-opacity duration-300 ${
                            songHover
                                ? "opacity-100"
                                : "pointer-events-none opacity-0"
                        }`}
                    >
                        <label className="truncate text-2xl font-bold">
                            {currentMedia.name}
                        </label>
                        <label className="text-md w-fit flex-nowrap truncate text-left font-semibold text-neutral-400">
                            {currentMedia.country ?? "Radio Station"}
                        </label>
                    </div>
                </div>
            </div>
        );
    } else return undefined;
}
