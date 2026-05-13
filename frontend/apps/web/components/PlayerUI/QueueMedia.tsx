"use client";

import Image from "next/image";
import { QueueResponseItem } from "@/dto";
import { useStore } from "@nanostores/react";
import { GripVertical, Pause, Play } from "lucide-react";
import { getMediaArtists, getMediaDuration } from "@/models/types/media";
import { rockIt } from "@/lib/rockit/rockIt";
import { getTime } from "@/lib/utils/getTime";

export function QueueMedia({
    media,
    onClick,
}: {
    media: QueueResponseItem;
    onClick?: () => void;
}) {
    const $currentQueueMediaId = useStore(
        rockIt.queueManager.currentQueueMediaIdAtom
    );
    const $playing = useStore(rockIt.mediaPlayerManager.playingAtom);

    const isCurrent = media.queueMediaId === $currentQueueMediaId;

    return (
        <div
            onClick={onClick}
            className={`group flex cursor-grab items-center gap-x-2 p-2 active:cursor-grabbing ${
                isCurrent
                    ? "bg-[rgba(50,50,50,0.75)]"
                    : "md:hover:bg-[rgba(75,75,75,0.75)]"
            }`}
        >
            <div className="flex cursor-grab items-center pr-1 active:cursor-grabbing">
                <GripVertical className="h-4 w-4 text-gray-500 opacity-0 transition-opacity group-hover:opacity-100" />
            </div>

            <div className="relative shrink-0">
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

            <p className="shrink-0 px-2 text-sm text-gray-300">
                {getTime(getMediaDuration(media.media) ?? 0)}
            </p>
        </div>
    );
}
