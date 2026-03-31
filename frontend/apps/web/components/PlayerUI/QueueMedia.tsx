"use client";

import Image from "next/image";
import { useStore } from "@nanostores/react";
import { Pause, Play } from "lucide-react";
import { QueueResponseItem } from "@/dto";
import { rockIt } from "@/lib/rockit/rockIt";
import { getTime } from "@/lib/utils/getTime";
import { getMediaArtists, getMediaDuration } from "@/types/media";

export function QueueMedia({ media }: { media: QueueResponseItem }) {
    const $currentQueueMediaId = useStore(
        rockIt.queueManager.currentQueueMediaIdAtom
    );
    const $playing = useStore(rockIt.audioManager.playingAtom);

    const isCurrent = media.queueMediaId === $currentQueueMediaId;

    // TODO: implement click handler when queueManager.playMediaFromQueue is available
    const handleClick = () => {};

    return (
        <li
            onClick={handleClick}
            className={`group flex items-center gap-x-2 p-2 ${
                isCurrent
                    ? "bg-[rgba(50,50,50,0.75)]"
                    : "md:hover:bg-[rgba(75,75,75,0.75)]"
            }`}
        >
            <div className="relative">
                <Image
                    src={
                        media.media.imageUrl ??
                        rockIt.SONG_PLACEHOLDER_IMAGE_URL
                    }
                    alt={media.media.name}
                    className={`h-12 w-12 rounded object-cover ${isCurrent ? "brightness-50" : ""}`}
                    width={100}
                    height={100}
                />
                {isCurrent && (
                    <div className="absolute inset-0 flex items-center justify-center">
                        {$playing ? (
                            <Pause className="h-5 w-5 fill-current text-white" />
                        ) : (
                            <Play className="h-5 w-5 fill-current text-white" />
                        )}
                    </div>
                )}
            </div>

            <div className="max-w-full min-w-0 flex-1">
                <p className="truncate text-base font-semibold text-white">
                    {media.media.name}
                </p>
                <p className="truncate text-sm text-gray-300">
                    {getMediaArtists(media.media)
                        ?.map((a: { name: string }) => a.name)
                        .join(", ")}
                </p>
            </div>

            <p className="px-2 text-sm text-gray-300">
                {getTime(getMediaDuration(media.media) ?? 0)}
            </p>
        </li>
    );
}
