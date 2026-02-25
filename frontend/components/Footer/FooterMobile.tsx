"use client";

import { useStore } from "@nanostores/react";
import { Play, Pause } from "lucide-react";
import LikeButton from "@/components/LikeButton";
import Slider from "@/components/Slider";
import { rockIt } from "@/lib/rockit/rockIt";
import Image from "next/image";

export default function FooterMobile() {
    const $playing = useStore(rockIt.audioManager.playingAtom);
    const $currentSong = useStore(rockIt.queueManager.currentSongAtom);
    const $currentTime = useStore(rockIt.audioManager.currentTimeAtom);

    return (
        <div className="h-full w-full pb-1">
            <div
                className="group grid h-full w-full grid-cols-[min-content_1fr_min-content_min-content] items-center gap-x-2 rounded-md bg-black/80 pr-2"
                onClick={() => {
                    rockIt.playerUIManager.toggle();
                    // if (isMobilePlayerUIVisible.get()) {
                    //     isMobilePlayerUIVisible.set(false);
                    //     setTimeout(() => {
                    //         isMobilePlayerUIVisible.set(true);
                    //     }, 500);
                    // } else {
                    //     isMobilePlayerUIVisible.set(true);
                    // }
                }}
            >
                <div className="aspect-square h-full w-auto">
                    <Image
                        src={
                            $currentSong?.internalImageUrl ??
                            rockIt.SONG_PLACEHOLDER_IMAGE_URL
                        }
                        alt="Album Cover"
                        className="h-full w-full rounded-md p-1"
                    />
                </div>

                <div className="flex min-w-0 flex-col">
                    <label className="truncate font-semibold">
                        {$currentSong?.name}
                    </label>
                    <label className="truncate text-sm">
                        {$currentSong?.artists
                            .map((artist) => artist.name)
                            .join(", ")}
                    </label>
                </div>

                {$currentSong && (
                    <LikeButton songPublicId={$currentSong.publicId} />
                )}
                {$playing ? (
                    <Pause
                        className="h-full fill-current text-white"
                        onClick={(event) => {
                            rockIt.audioManager.pause();
                            event.stopPropagation();
                        }}
                    />
                ) : (
                    <Play
                        className="h-full fill-current text-white"
                        onClick={(event) => {
                            rockIt.audioManager.play();
                            event.stopPropagation();
                        }}
                    />
                )}
            </div>
            <div className="">
                <Slider
                    readOnly
                    id="default-slider"
                    className="group relative bottom-[0.15rem] ml-1 mr-1 h-[0.15rem] w-auto rounded bg-neutral-700"
                    value={$currentTime ?? 0}
                    min={0}
                    max={$currentSong?.duration}
                    step={0.001}
                />
            </div>
        </div>
    );
}
