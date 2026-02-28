"use client";

import { useState } from "react";
import Image from "next/image";
import { useStore } from "@nanostores/react";
import {
    ChevronDown,
    Ellipsis,
    Pause,
    Play,
    Repeat,
    Shuffle,
    SkipBack,
    SkipForward,
} from "lucide-react";
import { rockIt } from "@/lib/rockit/rockIt";
import { getTime } from "@/lib/utils/getTime";
import useWindowSize from "@/hooks/useWindowSize";
import LikeButton from "@/components/LikeButton";
import SongPopupMenu from "@/components/ListSongs/SongPopupMenu";
import { useMobilePlayerVisibility } from "@/components/PlayerUI/hooks/useMobilePlayerVisibility";
import { useMobileSwipeDismiss } from "@/components/PlayerUI/hooks/useMobileSwipeDismiss";
import MobilePlayerUILyrics from "@/components/PlayerUI/MobilePlayerUILyrics";
import MobilePlayerUIQueue from "@/components/PlayerUI/MobilePlayerUIQueue";
import Slider from "@/components/Slider";

export default function MobilePlayerUI() {
    const $playing = useStore(rockIt.audioManager.playingAtom);
    const $currentTime = useStore(rockIt.audioManager.currentTimeAtom);
    const $currentSong = useStore(rockIt.queueManager.currentSongAtom);
    const $randomQueue = useStore(rockIt.userManager.randomQueueAtom);

    const { width: innerWidth } = useWindowSize();
    const [queueOpen, setQueueOpen] = useState(false);
    const [lyricsOpen, setLyricsOpen] = useState(false);

    const { hidden, atTop, animated } = useMobilePlayerVisibility();

    const { divRef, topOffset } = useMobileSwipeDismiss({
        blocked: queueOpen || lyricsOpen,
        onHide: () => rockIt.playerUIManager.hide(),
    });

    // SSR guard + only mount on mobile
    if (!innerWidth || innerWidth >= 768) return null;

    if (hidden) return null;

    const coverSrc =
        $currentSong?.internalImageUrl ?? rockIt.SONG_PLACEHOLDER_IMAGE_URL;

    return (
        <div
            ref={divRef}
            className={[
                "fixed right-0 left-0 z-40 flex h-[calc(100%-3rem)] w-screen overflow-hidden md:hidden",
                // touch-action: pan-y lets the browser handle horizontal swipes natively
                // will-change: transform hints GPU layer for smooth animation on iOS
                atTop ? "top-0" : "top-full",
                animated ? "transition-[top] duration-300" : "",
            ]
                .filter(Boolean)
                .join(" ")}
            style={{
                top: topOffset ? `${topOffset}px` : undefined,
                willChange: topOffset ? "transform" : "auto",
                touchAction: "pan-y",
            }}
        >
            {/* Blurred background cover */}
            <div
                className="absolute inset-0 -top-5 -right-5 -bottom-5 -left-5 bg-cover bg-center"
                style={{
                    backgroundImage: `url(${coverSrc})`,
                    filter: "blur(10px) brightness(0.5)",
                }}
            />

            {/* Top bar: close + options */}
            <div className="absolute top-14 right-0 left-0 z-50 flex justify-between p-5">
                <ChevronDown
                    className="h-8 w-8 cursor-pointer text-neutral-300"
                    onClick={() => rockIt.playerUIManager.hide()}
                />
                {$currentSong ? (
                    <SongPopupMenu song={$currentSong}>
                        <Ellipsis className="h-6 w-8 text-neutral-300" />
                    </SongPopupMenu>
                ) : (
                    <Ellipsis className="h-6 w-8 text-neutral-300" />
                )}
            </div>

            {/* Main content */}
            <div className="relative z-30 grid h-full w-full grid-rows-[1fr_min-content_min-content_min-content] items-center justify-center gap-y-2 px-4 pt-32 pb-20 text-white">
                {/* Song artwork */}
                <Image
                    src={coverSrc}
                    alt={$currentSong?.name ?? "Current song artwork"}
                    width={600}
                    height={600}
                    className="relative left-1/2 aspect-square h-auto max-h-full min-h-0 w-auto max-w-full min-w-0 -translate-x-1/2 rounded-lg object-cover"
                    priority
                />

                {/* Title, artist, like */}
                <div className="flex w-full max-w-md items-center justify-between pr-7 pl-5">
                    <div className="min-w-0 flex-1 text-left">
                        <h2 className="truncate text-xl font-[650]">
                            {$currentSong?.name}
                        </h2>
                        <p className="truncate font-semibold text-gray-300">
                            {$currentSong?.artists
                                .map((a) => a.name)
                                .join(", ")}
                        </p>
                    </div>
                    {$currentSong && (
                        <LikeButton songPublicId={$currentSong.publicId} />
                    )}
                </div>

                {/* Progress slider */}
                <div className="w-full max-w-md px-4 py-3">
                    <Slider
                        id="mobile-player-slider"
                        value={$currentTime || 0}
                        className="h-2 w-full cursor-pointer appearance-none bg-neutral-700"
                        min={0}
                        max={$currentSong?.duration}
                        step={0.001}
                        onChange={(e) =>
                            rockIt.audioManager.setCurrentTime(
                                Number(e.target.value)
                            )
                        }
                    />
                    <div className="mt-1 flex justify-between text-sm text-neutral-100">
                        <span>{getTime($currentTime || 0)}</span>
                        <span>{getTime($currentSong?.duration || 0)}</span>
                    </div>
                </div>

                {/* Playback controls */}
                <div className="relative left-1/2 flex w-fit -translate-x-1/2 items-center gap-3">
                    <button
                        className="flex h-12 w-12 items-center justify-center"
                        onClick={() => rockIt.userManager.toggleRandomQueue()}
                        aria-label="Shuffle"
                    >
                        <Shuffle
                            className={`h-6 w-6 ${$randomQueue ? "text-[#ee1086]" : "text-white"}`}
                        />
                    </button>

                    <button
                        className="flex h-12 w-12 items-center justify-center"
                        onClick={() => rockIt.queueManager.skipBack()}
                        aria-label="Previous"
                    >
                        <SkipBack className="h-8 w-8 fill-current" />
                    </button>

                    <button
                        className="flex h-16 w-16 items-center justify-center rounded-full"
                        onClick={() =>
                            $playing
                                ? rockIt.audioManager.pause()
                                : rockIt.audioManager.play()
                        }
                        aria-label={$playing ? "Pause" : "Play"}
                    >
                        {$playing ? (
                            <Pause className="h-14 w-14 fill-current" />
                        ) : (
                            <Play className="h-14 w-14 fill-current" />
                        )}
                    </button>

                    <button
                        className="flex h-12 w-12 items-center justify-center"
                        onClick={() => rockIt.queueManager.skipForward()}
                        aria-label="Next"
                    >
                        <SkipForward className="h-8 w-8 fill-current" />
                    </button>

                    <button
                        className="flex h-12 w-12 items-center justify-center"
                        aria-label="Repeat"
                    >
                        {/* TODO: wire repeat mode when audioManager.toggleRepeat is available */}
                        <Repeat className="h-6 w-6" />
                    </button>
                </div>

                {/* Sub-panel triggers */}
                <div className="absolute right-0 bottom-0 left-0 flex items-center justify-around bg-linear-to-t from-black/50 to-black/0 px-4 py-7 font-bold text-white safe-area-bottom">
                    <button
                        className="text-lg"
                        onClick={() => setQueueOpen(true)}
                    >
                        Queue
                    </button>
                    <button
                        className="text-lg"
                        onClick={() => setLyricsOpen(true)}
                    >
                        Lyrics
                    </button>
                    <button className="text-lg">Related</button>
                </div>
            </div>

            <MobilePlayerUIQueue open={queueOpen} setOpen={setQueueOpen} />
            <MobilePlayerUILyrics open={lyricsOpen} setOpen={setLyricsOpen} />
        </div>
    );
}
