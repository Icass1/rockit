"use client";

import { useState } from "react";
import { useStore } from "@nanostores/react";
import { EMediaContextLocation } from "@rockit/shared";
import { rockIt } from "@/lib/rockit/rockIt";
import MediaContextMenu from "@/components/MediaContextMenu/MediaContextMenu";
import { QueueMedia } from "@/components/PlayerUI/QueueMedia";

export default function PlayerUIQueue() {
    const $queue = useStore(rockIt.queueManager.queueAtom);
    const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

    const handleDragStart = (e: React.DragEvent, index: number) => {
        e.dataTransfer.setData("text/plain", String(index));
        e.dataTransfer.effectAllowed = "move";
    };

    const handleDragOver = (e: React.DragEvent, index: number) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        setDragOverIndex(index);
    };

    const handleDragLeave = () => {
        setDragOverIndex(null);
    };

    const handleDrop = (e: React.DragEvent, toIndex: number) => {
        e.preventDefault();
        const fromIndex = parseInt(e.dataTransfer.getData("text/plain"));
        if (!isNaN(fromIndex) && fromIndex !== toIndex) {
            rockIt.queueManager.reorderQueue(fromIndex, toIndex);
        }
        setDragOverIndex(null);
    };

    const handleClick = (queueMediaId: number) => {
        rockIt.queueManager.setQueueMediaId(queueMediaId);
        rockIt.mediaPlayerManager.play();
    };

    return (
        <div
            data-queue-scroll
            className="flex h-full max-h-full min-h-0 w-full max-w-full min-w-0 flex-col overflow-y-auto"
        >
            {$queue.map((queueItem, index) => (
                <div
                    key={queueItem.queueMediaId}
                    draggable="true"
                    onDragStart={(e) => handleDragStart(e, index)}
                    onDragOver={(e) => handleDragOver(e, index)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, index)}
                    onDragEnd={handleDragLeave}
                    className={
                        dragOverIndex === index
                            ? "border-t-2 border-[#ee1086]"
                            : ""
                    }
                >
                    <MediaContextMenu
                        media={queueItem.media}
                        location={EMediaContextLocation.QUEUE}
                    >
                        <QueueMedia
                            media={queueItem}
                            onClick={() =>
                                handleClick(queueItem.queueMediaId)
                            }
                        />
                    </MediaContextMenu>
                </div>
            ))}
        </div>
    );
}
