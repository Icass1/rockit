import { JSX, useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useStore } from "@nanostores/react";
import { isSong, isStation, isVideo, TPlayableMedia } from "@rockit/shared";
import { Disc3, DiscAlbum, Pause, Play, Video, VideoOff } from "lucide-react";
import { resolveOfflineCoverUrl } from "@/lib/offline/store";
import { rockIt } from "@/lib/rockit/rockIt";
import Artists from "@/components/Artists/Artists";
import VinylRecord from "@/components/PlayerUI/VinylRecord";
import VinylTransition from "@/components/PlayerUI/VinylTransition";

export default function PlayerUIMain({
    currentMedia,
}: {
    currentMedia: TPlayableMedia;
}): JSX.Element | undefined {
    const $playing = useStore(rockIt.mediaPlayerManager.playingAtom);
    const $audioOnly = useStore(rockIt.mediaPlayerManager.audioOnlyAtom);
    const [showIcon, setShowIcon] = useState(false);
    const [titleVisible, setTitleVisible] = useState(true);
    const [songHover, setSongHover] = useState(false);
    const vinylMode = useStore(rockIt.playerUIManager.vinylModeAtom);
    useEffect(() => {
        rockIt.playerUIManager.initializeArtworkMode();
    }, []);
    const videoContainerRef = useRef<HTMLDivElement | null>(null);
    const hideTitleTimerRef = useRef<ReturnType<typeof setTimeout>>(null);
    const [offlineCover, setOfflineCover] = useState<{
        publicId: string;
        url: string;
    } | null>(null);

    useEffect((): (() => void) | undefined => {
        let cancelled = false;
        if (isSong(currentMedia)) {
            resolveOfflineCoverUrl(currentMedia.publicId).then((url) => {
                if (!cancelled && url)
                    setOfflineCover({ publicId: currentMedia.publicId, url });
            });
        }
        return (): void => {
            cancelled = true;
        };
    }, [currentMedia]);

    const coverSrc =
        offlineCover?.publicId === currentMedia.publicId
            ? offlineCover.url
            : currentMedia.imageUrl;

    useEffect((): (() => void) | undefined => {
        if (!showIcon) return;
        const t = setTimeout((): void => setShowIcon(false), 800);
        return (): void => clearTimeout(t);
    }, [showIcon]);

    // Attach synchronously during React's commit. A passive effect left a frame
    // where the player showed an empty placeholder; moving the long-lived DOM
    // video through a ref makes its presence deterministic when the player opens.
    const attachVideoRef = useCallback(
        (container: HTMLDivElement | null): void => {
            const previous = videoContainerRef.current;
            if (previous) {
                rockIt.mediaPlayerManager.detachVideoFromContainer(previous);
            }
            videoContainerRef.current = container;
            if (container && isVideo(currentMedia) && !$audioOnly) {
                rockIt.mediaPlayerManager.attachVideoToContainer(container);
                const video = rockIt.mediaPlayerManager.videoElement;
                const updateAspectRatio = (): void => {
                    if (!video?.videoWidth || !video.videoHeight) return;
                    container.style.setProperty(
                        "--player-video-aspect",
                        `${video.videoWidth} / ${video.videoHeight}`
                    );
                };
                updateAspectRatio();
                video?.addEventListener("loadedmetadata", updateAspectRatio);
                video?.addEventListener("resize", updateAspectRatio);
            }
        },
        [currentMedia, $audioOnly]
    );

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
                    className="relative h-[90%] max-h-[90%] w-full max-w-full cursor-pointer overflow-hidden rounded-xl"
                    style={{
                        aspectRatio: "var(--player-video-aspect, 16 / 9)",
                    }}
                    onClick={handleClick}
                >
                    {$audioOnly ? (
                        <Image
                            src={coverSrc}
                            fill
                            alt={currentMedia.name}
                            className="object-cover"
                            draggable={false}
                        />
                    ) : (
                        <div
                            ref={attachVideoRef}
                            className="absolute inset-0 overflow-hidden [&_video]:!absolute [&_video]:!inset-0 [&_video]:!h-full [&_video]:!w-full [&_video]:!object-contain"
                            data-testid="player-video-surface"
                        />
                    )}
                    {iconOverlay}
                    {rockIt.mediaPlayerManager.canPlayAudioOnly(
                        currentMedia
                    ) && (
                        <div
                            className={`absolute top-0 right-0 z-20 flex items-start pt-4 pr-4 transition-opacity duration-300 ${
                                titleVisible
                                    ? "opacity-100"
                                    : "pointer-events-none opacity-0"
                            }`}
                        >
                            <button
                                type="button"
                                onClick={(e): void => {
                                    e.stopPropagation();
                                    rockIt.mediaPlayerManager.toggleAudioOnly();
                                }}
                                className="ignore-click-player-ui flex items-center justify-center rounded-full bg-black/50 p-2 text-white/80 transition-colors hover:text-white"
                                title={$audioOnly ? "Show video" : "Audio only"}
                                aria-label={
                                    $audioOnly ? "Show video" : "Audio only"
                                }
                            >
                                {$audioOnly ? (
                                    <VideoOff className="pointer-events-none h-6 w-6" />
                                ) : (
                                    <Video className="pointer-events-none h-6 w-6" />
                                )}
                            </button>
                        </div>
                    )}
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
                className="group ignore-click-player-ui @container relative flex h-full w-full items-center justify-center"
                onMouseEnter={(): void => setSongHover(true)}
                onMouseLeave={(): void => setSongHover(false)}
            >
                <div
                    className="relative aspect-square w-[min(100cqw,96cqh,calc(100vh_-_15rem))] cursor-pointer overflow-hidden rounded-xl"
                    onClick={handleClick}
                >
                    {!vinylMode && (
                        <div
                            className={`absolute top-0 right-0 left-0 z-30 flex flex-row items-start bg-linear-to-b from-black/60 to-transparent pt-4 pr-5 pb-12 pl-4 transition-opacity duration-300 ${
                                songHover
                                    ? "opacity-100"
                                    : "pointer-events-none opacity-0"
                            }`}
                        >
                            <button
                                type="button"
                                onClick={(e): void => {
                                    e.stopPropagation();
                                    rockIt.playerUIManager.toggleVinylMode();
                                }}
                                className="ignore-click-player-ui flex items-center justify-center rounded-full p-2 text-white/80 transition-colors hover:text-white"
                                title="Vinyl record"
                            >
                                <Disc3 className="pointer-events-none h-8 w-8" />
                            </button>
                        </div>
                    )}
                    {vinylMode ? (
                        <div className="relative h-full w-full">
                            <VinylTransition media={currentMedia}>
                                <VinylRecord
                                    imageUrl={coverSrc}
                                    name={currentMedia.name}
                                    artists={currentMedia.artists}
                                    isPlaying={$playing}
                                />
                            </VinylTransition>
                            <button
                                type="button"
                                onClick={(e): void => {
                                    e.stopPropagation();
                                    rockIt.playerUIManager.toggleVinylMode();
                                }}
                                className="ignore-click-player-ui absolute top-2 left-2 z-30 flex items-center justify-center rounded-full p-3 text-white/80 opacity-0 transition-opacity group-hover:opacity-100 hover:text-white"
                                title="Square cover"
                            >
                                <DiscAlbum className="pointer-events-none h-10 w-10" />
                            </button>
                        </div>
                    ) : (
                        <>
                            <Image
                                src={coverSrc}
                                fill
                                alt={currentMedia.name}
                                className="object-cover"
                                draggable={false}
                            />
                        </>
                    )}
                    {iconOverlay}
                    {!vinylMode && (
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
                    )}
                </div>
            </div>
        );
    } else if (isStation(currentMedia)) {
        return (
            <div
                className="@container relative flex h-full w-full items-center justify-center"
                onMouseEnter={(): void => setSongHover(true)}
                onMouseLeave={(): void => setSongHover(false)}
            >
                <div
                    className="relative aspect-square w-[min(100cqw,96cqh,calc(100vh_-_15rem))] cursor-pointer overflow-hidden rounded-xl"
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
