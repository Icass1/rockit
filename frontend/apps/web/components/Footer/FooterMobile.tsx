"use client";

import Image from "next/image";
import { useStore } from "@nanostores/react";
import { Pause, Play } from "lucide-react";
import { getMediaArtists, getMediaDuration } from "@/types/media";
import { rockIt } from "@/lib/rockit/rockIt";
import LikeButton from "@/components/LikeButton";
import Slider from "@/components/Slider/Slider";

export default function FooterMobile() {
    const $playing = useStore(rockIt.audioManager.playingAtom);
    const $currentMedia = useStore(rockIt.queueManager.currentMediaAtom);
    const $currentTime = useStore(rockIt.audioManager.currentTimeAtom);

    return (
        <div className="h-full w-full pb-1">
            {/*
             * Main bar — button so the entire row is keyboard/a11y accessible.
             * stopPropagation on the play/pause and like buttons prevents
             * the parent onClick from firing when tapping those controls.
             */}
            <button
                type="button"
                aria-label="Open player"
                className="grid h-full w-full grid-cols-[min-content_1fr_min-content_min-content] items-center gap-x-2 rounded-md bg-black/80 pr-2 text-left"
                onClick={() => rockIt.playerUIManager.toggle()}
            >
                {/* Album art — width/height required by next/image */}
                <div className="aspect-square h-full w-auto">
                    <Image
                        src={
                            $currentMedia?.imageUrl ??
                            rockIt.SONG_PLACEHOLDER_IMAGE_URL
                        }
                        alt={
                            $currentMedia
                                ? `${$currentMedia.name} cover`
                                : "Album cover"
                        }
                        width={56}
                        height={56}
                        className="h-full w-full rounded-md object-cover p-1"
                    />
                </div>

                {/* Song info — p instead of label (label is for form elements) */}
                <div className="flex min-w-0 flex-col">
                    <p className="truncate leading-tight font-semibold">
                        {$currentMedia?.name ?? ""}
                    </p>
                    <p className="truncate text-sm leading-tight text-neutral-400">
                        {getMediaArtists($currentMedia)
                            ?.map((a: { name: string }) => a.name)
                            .join(", ") ?? ""}
                    </p>
                </div>

                {/* Like */}
                {$currentMedia && (
                    <span onClick={(e) => e.stopPropagation()}>
                        <LikeButton mediaPublicId={$currentMedia.publicId} />
                    </span>
                )}

                {/* Play / Pause — stopPropagation so it doesn't open the player */}
                <span
                    role="button"
                    aria-label={$playing ? "Pause" : "Play"}
                    className="flex h-8 w-8 items-center justify-center"
                    onClick={(e) => {
                        e.stopPropagation();
                        if ($playing) {
                            rockIt.audioManager.pause();
                        } else {
                            rockIt.audioManager.play();
                        }
                    }}
                >
                    {$playing ? (
                        <Pause className="h-6 w-6 fill-current text-white" />
                    ) : (
                        <Play className="h-6 w-6 fill-current text-white" />
                    )}
                </span>
            </button>

            {/* Progress bar — readOnly, visual only */}
            <Slider
                readOnly
                id="default-slider"
                aria-label="Song progress"
                className="relative bottom-[0.15rem] mx-1 h-[0.15rem] w-auto rounded bg-neutral-700"
                value={$currentTime ?? 0}
                min={0}
                max={getMediaDuration($currentMedia)}
                step={0.001}
            />
        </div>
    );
}
