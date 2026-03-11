"use client";

import React, { useEffect, useRef, useState } from "react";
import { QueueResponseItem } from "@/dto";
import { useStore } from "@nanostores/react";
import {
    GripVertical,
    HardDriveDownload,
    ListX,
    PlayCircle,
} from "lucide-react";
import useWindowSize from "@/hooks/useWindowSize";
import { rockIt } from "@/lib/rockit/rockIt";
import ContextMenuContent from "@/components/ContextMenu/Content";
import ContextMenu from "@/components/ContextMenu/ContextMenu";
import ContextMenuOption from "@/components/ContextMenu/Option";
import ContextMenuTrigger from "@/components/ContextMenu/Trigger";
import { useQueueDrag } from "@/components/PlayerUI/hooks/useQueueDrag";
import { QueueMedia } from "@/components/PlayerUI/QueueMedia";

export default function MobilePlayerUIQueue({
    open,
    setOpen,
}: {
    open: boolean;
    setOpen: React.Dispatch<React.SetStateAction<boolean>>;
}) {
    const $queue = useStore(rockIt.queueManager.queueAtom);
    const { height } = useWindowSize();
    const scrollRef = useRef<HTMLDivElement>(null);
    // queueScroll state is only used for the virtual-scroll culling check.
    // calcItemTop uses scrollRef.current.scrollTop directly (sync, not stale).
    const [queueScroll, setQueueScroll] = useState(0);
    const { draggingMedia, startDrag, calcItemTop } = useQueueDrag();
    const $vocabulary = useStore(rockIt.vocabularyManager.vocabularyAtom);

    // Scroll to current media when queue panel opens
    useEffect(() => {
        if (!scrollRef.current || !open) return;
        const currentIdx = rockIt.queueManager.queue?.findIndex(
            (s) => s.queueMediaId === rockIt.queueManager.currentQueueMediaId
        );
        if (currentIdx == null || currentIdx === -1) return;
        scrollRef.current.scrollTo({ top: currentIdx * 64 - 100 });
    }, [open]);

    const touchStart = (
        e: React.TouchEvent,
        media: QueueResponseItem,
        index: number
    ) => {
        startDrag(e.touches[0].clientY, media, index);
    };

    // TODO: implement when queueManager supports reorder / remove
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const handleRemoveMedia = (_media: QueueResponseItem) => {};
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const handlePlayMedia = async (_media: QueueResponseItem) => {};

    const hasQueue = $queue && $queue.length > 0;
    if (!hasQueue || !height) return null;

    // Use queueScroll state (updated via onScroll) instead of accessing ref during render
    const currentScrollTop = queueScroll;

    return (
        <div
            id="MobilePlayerUIQueue"
            className="absolute z-50 grid h-[calc(100%-5rem)] w-full select-none grid-rows-[40px_1fr] rounded-t-lg bg-gray-700 pl-2 pt-4 transition-[top] duration-300 md:select-text"
            style={{ top: open ? "80px" : `${height}px` }}
        >
            {/* Header */}
            <button
                className="h-full text-center text-xl font-semibold"
                onClick={() => setOpen(false)}
            >
                Queue
            </button>

            <div className="absolute bottom-0 left-0 right-0 top-12">
                <div
                    ref={scrollRef}
                    onScroll={(e) => setQueueScroll(e.currentTarget.scrollTop)}
                    className={`relative h-full ${!draggingMedia ? "overflow-y-auto" : "overflow-y-hidden"}`}
                    // iOS momentum scrolling
                    style={
                        {
                            WebkitOverflowScrolling: "touch",
                        } as React.CSSProperties
                    }
                >
                    <div className="min-h-5" />
                    <div style={{ height: $queue.length * 64 }}>
                        {$queue.map((media, index) => {
                            // Use queueScroll state for calcItemTop
                            const top = calcItemTop(
                                index,
                                media,
                                currentScrollTop
                            );
                            const isDragging =
                                draggingMedia?.media.media.publicId ===
                                media.media.publicId;

                            // Virtual scroll: skip off-screen items
                            if (
                                top > queueScroll + height ||
                                top < queueScroll - 74
                            ) {
                                return null;
                            }

                            return (
                                <div
                                    key={`${media.media.publicId}-${media.queueMediaId}`}
                                    className={`absolute w-full ${isDragging ? "z-10" : "transition-[top] duration-500"}`}
                                    style={{
                                        top: `${top + 20}px`,
                                        transitionTimingFunction:
                                            "cubic-bezier(0.4, 0, 0.2, 1)",
                                        willChange: isDragging ? "top" : "auto",
                                    }}
                                >
                                    <ContextMenu>
                                        <ContextMenuTrigger>
                                            <div className="grid grid-cols-[1fr_45px] items-center">
                                                <div className="w-full min-w-0 max-w-full">
                                                    <QueueMedia media={media} />
                                                </div>
                                                <GripVertical
                                                    className="h-full w-full p-1 pr-3"
                                                    onTouchStart={(e) =>
                                                        touchStart(
                                                            e,
                                                            media,
                                                            index
                                                        )
                                                    }
                                                />
                                            </div>
                                        </ContextMenuTrigger>
                                        <ContextMenuContent
                                            cover={
                                                media.media.internalImageUrl ??
                                                rockIt.SONG_PLACEHOLDER_IMAGE_URL
                                            }
                                            title={media.media.name}
                                            // description={`${media.media.album.name} • ${media.media.artists.map((a) => a.name).join(", ")}`}
                                        >
                                            <ContextMenuOption
                                                onClick={() =>
                                                    handlePlayMedia(media)
                                                }
                                            >
                                                <PlayCircle className="h-5 w-5" />
                                                {$vocabulary.PLAY_MEDIA}
                                            </ContextMenuOption>
                                            <ContextMenuOption
                                                onClick={() =>
                                                    handleRemoveMedia(media)
                                                }
                                            >
                                                <ListX className="h-5 w-5" />
                                                {$vocabulary.REMOVE_FROM_QUEUE}
                                            </ContextMenuOption>
                                            <ContextMenuOption
                                                onClick={() =>
                                                    rockIt.indexedDBManager.saveMediaToIndexedDB(
                                                        media.media
                                                    )
                                                }
                                            >
                                                <HardDriveDownload className="h-5 w-5" />
                                                {
                                                    $vocabulary.DOWNLOAD_MEDIA_TO_DEVICE
                                                }
                                            </ContextMenuOption>
                                        </ContextMenuContent>
                                    </ContextMenu>
                                </div>
                            );
                        })}
                    </div>
                    <div className="min-h-10" />
                </div>

                {/* Fade overlays */}
                <div className="bg-linear-to-t pointer-events-none absolute -top-1 h-10 w-full from-transparent to-gray-700" />
                <div className="bg-linear-to-b pointer-events-none absolute bottom-0 h-10 w-full from-transparent to-gray-700" />
            </div>
        </div>
    );
}
