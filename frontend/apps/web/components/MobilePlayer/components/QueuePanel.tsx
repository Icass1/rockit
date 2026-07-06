"use client";

import type { JSX } from "react";
import type { TPlayableMedia } from "@rockit/shared";
import type { QueueItem } from "@/models/interfaces/queue";
import { usePlayer } from "@/lib/PlayerContext";
import QueueRow from "@/components/MobilePlayer/components/QueueRow";
import { useDragReorder } from "@/components/MobilePlayer/hooks/useDragReorder";

function getPlayableMedia(item: QueueItem): TPlayableMedia {
    return item.media;
}

export default function QueuePanel(): JSX.Element {
    const {
        queue,
        currentMedia,
        removeFromQueue,
        reorderQueue,
        playQueueItem,
    } = usePlayer();

    const {
        draggingIndex,
        overIndex,
        registerRow,
        handlePointerDown,
        handlePointerMove,
        handlePointerUp,
    } = useDragReorder(queue?.length ?? 0, (from: number, to: number) =>
        reorderQueue(from, to)
    );

    if (!queue || queue.length === 0) {
        return (
            <div className="flex h-full items-center justify-center">
                <p className="text-base text-(--color-muted)">
                    Tu cola está vacía
                </p>
            </div>
        );
    }

    return (
        <div
            className="flex h-full flex-col"
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
        >
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-3">
                <p className="text-lg font-bold text-white">Cola</p>
                <p className="text-sm text-(--color-muted)">
                    {queue.length} canciones
                </p>
            </div>

            <div className="hide-scroll-thumb flex-1 overflow-y-auto pb-10">
                {queue.map((item: QueueItem, index: number): JSX.Element => {
                    const playable = getPlayableMedia(item);
                    const isActive =
                        playable.publicId === currentMedia?.publicId;
                    return (
                        <QueueRow
                            key={`${item.queueMediaId}-${index}`}
                            media={playable}
                            index={index}
                            isActive={isActive}
                            isDragging={draggingIndex === index}
                            isDropTarget={
                                overIndex === index && draggingIndex !== index
                            }
                            registerRow={registerRow}
                            onDragHandlePointerDown={handlePointerDown(index)}
                            onDelete={(): void => removeFromQueue(index)}
                            onPlay={(): void => {
                                playQueueItem(item.queueMediaId);
                            }}
                        />
                    );
                })}
            </div>
        </div>
    );
}
