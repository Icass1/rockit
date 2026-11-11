"use client";

import { JSX } from "react";
import Image from "next/image";
import { useStore } from "@nanostores/react";
import { ExplicitBadge } from "@rockit/ui";
import { GripVertical, Pause, Play } from "lucide-react";
import { QueueItem } from "@/models/interfaces/queue";
import {
    getMediaArtists,
    getMediaDuration,
    isDownloadable,
} from "@/models/types/media";
import { rockIt } from "@/lib/rockit/rockIt";
import { getTime } from "@/lib/utils/getTime";
import Artists from "@/components/Artists/Artists";
import { OfflineIndicator } from "@/components/OfflineIndicator/OfflineIndicator";
import { useVocabulary } from "@/components/providers/VocabularyProvider";
import ProviderTag from "@/components/ProviderTag/ProviderTag";

export function QueueMedia({
    media,
    onClick,
}: {
    media: QueueItem;
    onClick?: () => void;
}): JSX.Element {
    const vocabulary = useVocabulary();
    const $currentQueueMediaId = useStore(
        rockIt.queueManager.currentQueueMediaIdAtom
    );
    const $playing = useStore(rockIt.mediaPlayerManager.playingAtom);

    const isCurrent = media.queueMediaId === $currentQueueMediaId;

    return (
        <div
            onClick={onClick}
            className={`group flex cursor-grab items-center gap-x-2 rounded p-2 transition-colors active:cursor-grabbing ${
                isCurrent ? "bg-accent/40" : "md:hover:bg-hover/40"
            } ${isDownloadable(media.media) && !media.media.downloaded && "pointer-events-none opacity-50"}`}
        >
            <div className="flex cursor-grab items-center active:cursor-grabbing">
                <GripVertical
                    className={`text-subtle-foreground hover:text-foreground-strong h-5 w-5 transition-all ${
                        isCurrent
                            ? "opacity-100"
                            : "opacity-0 group-hover:opacity-100"
                    }`}
                />
            </div>

            <div className="relative shrink-0">
                <Image
                    draggable={false}
                    src={
                        media.media.imageUrl ||
                        (media.media.type === "station"
                            ? "/radio-placeholder.png"
                            : rockIt.SONG_PLACEHOLDER_IMAGE_URL)
                    }
                    alt={media.media.name}
                    className={`h-12 w-12 rounded object-cover ${isCurrent ? "brightness-50" : ""}`}
                    width={100}
                    height={100}
                />
                {isCurrent && (
                    <div
                        data-queue-play-toggle
                        className="absolute inset-0 flex cursor-pointer items-center justify-center"
                        onClick={(e): void => {
                            e.stopPropagation();
                            if ($playing) {
                                rockIt.mediaPlayerManager.pause();
                            } else {
                                rockIt.mediaPlayerManager.play();
                            }
                        }}
                    >
                        {$playing ? (
                            <Pause className="text-foreground-strong h-5 w-5 fill-current" />
                        ) : (
                            <Play className="text-foreground-strong h-5 w-5 fill-current" />
                        )}
                    </div>
                )}
            </div>

            <div className="max-w-full min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                    <p className="text-foreground-strong truncate text-base font-semibold">
                        {media.media.name}
                    </p>
                    <ExplicitBadge
                        explicit={
                            media.media.type === "song"
                                ? media.media.explicit
                                : null
                        }
                        label={vocabulary.CONTENT_RATING_EXPLICIT}
                    />
                    {"publicId" in media.media && (
                        <OfflineIndicator
                            publicId={media.media.publicId}
                            className="h-5 w-5"
                        />
                    )}
                </div>
                <div className="flex flex-row items-center gap-2">
                    <ProviderTag name={media.media.provider} iconOnly={true} />
                    <Artists
                        linkable={false}
                        className="text-foreground w-fit max-w-full min-w-0 flex-nowrap overflow-x-hidden text-left text-sm"
                        artists={getMediaArtists(media.media)}
                    />
                </div>
            </div>

            <p className="text-foreground shrink-0 px-2 text-sm">
                {getTime(getMediaDuration(media.media) ?? 0)}
            </p>
        </div>
    );
}
