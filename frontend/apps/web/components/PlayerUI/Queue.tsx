"use client";

import { JSX, useEffect, useRef, useState } from "react";
import { useStore } from "@nanostores/react";
import { EMediaContextLocation } from "@rockit/shared";
import { rockIt } from "@/lib/rockit/rockIt";
import MediaContextMenu from "@/components/MediaContextMenu/MediaContextMenu";
import { QueueMedia } from "@/components/PlayerUI/QueueMedia";

export default function PlayerUIQueue(): JSX.Element {
    const $queue = useStore(rockIt.queueManager.queueAtom);
    const $currentQueueMediaId = useStore(
        rockIt.queueManager.currentQueueMediaIdAtom
    );
    const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
    const queueContainerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        console.log(`Should scroll to element ${$currentQueueMediaId}`);
    }, [$currentQueueMediaId]);

    const handleDragStart = (e: React.DragEvent, index: number): void => {
        e.dataTransfer.setData("text/plain", String(index));
        e.dataTransfer.effectAllowed = "move";
    };

    const handleDragOver = (e: React.DragEvent, index: number): void => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        setDragOverIndex(index);
    };

    const handleDragLeave = (): void => {
        setDragOverIndex(null);
    };

    const handleDrop = (e: React.DragEvent, toIndex: number): void => {
        e.preventDefault();
        const fromIndex = parseInt(e.dataTransfer.getData("text/plain"));
        if (!isNaN(fromIndex) && fromIndex !== toIndex) {
            rockIt.queueManager.reorderQueue(fromIndex, toIndex);
        }
        setDragOverIndex(null);
    };

    const handleClick = (queueMediaId: number): void => {
        rockIt.queueManager.setQueueMediaId(queueMediaId);
        rockIt.mediaPlayerManager.play();
    };

    return (
        <div
            data-queue-scroll
            ref={queueContainerRef}
            className="flex h-full max-h-full min-h-0 w-full max-w-full min-w-0 flex-col overflow-y-auto mask-t-from-90% mask-b-from-90% py-16"
        >
            {$queue.map(
                (queueItem, index): JSX.Element => (
                    <div
                        key={queueItem.queueMediaId}
                        draggable="true"
                        onDragStart={(e): void => handleDragStart(e, index)}
                        onDragOver={(e): void => handleDragOver(e, index)}
                        onDragLeave={handleDragLeave}
                        onDrop={(e): void => handleDrop(e, index)}
                        onDragEnd={handleDragLeave}
                        className={`border-t-2 ${
                            dragOverIndex === index
                                ? "border-[#ee1086]"
                                : "border-transparent"
                        }`}
                    >
                        <MediaContextMenu
                            media={queueItem.media}
                            location={EMediaContextLocation.QUEUE}
                        >
                            <QueueMedia
                                media={queueItem}
                                onClick={(): void =>
                                    handleClick(queueItem.queueMediaId)
                                }
                            />
                        </MediaContextMenu>
                    </div>
                )
            )}
        </div>
    );
}
