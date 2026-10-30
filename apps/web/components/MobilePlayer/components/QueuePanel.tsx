"use client";

import { useMemo, type JSX } from "react";
import type { TPlayableMedia } from "@rockit/shared";
import { getTotalDuration } from "@rockit/shared";
import type { QueueItem } from "@/models/interfaces/queue";
import { useFixedVirtualWindow } from "@/hooks/useFixedVirtualWindow";
import { usePlayer } from "@/lib/PlayerContext";
import { rockIt } from "@/lib/rockit/rockIt";
import DurationToggle from "@/components/DurationToggle";
import QueueRow from "@/components/MobilePlayer/components/QueueRow";
import { useDragReorder } from "@/components/MobilePlayer/hooks/useDragReorder";
import AutoplayRecommendations from "@/components/Recommendations/AutoplayRecommendations";

const QUEUE_ROW_HEIGHT = 68;

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
    } = useDragReorder(queue?.length ?? 0, (from: number, to: number) => {
        if (rockIt.queueManager.isQueueFullyLoaded) reorderQueue(from, to);
    });
    const {
        containerRef,
        onScroll,
        startIndex,
        endIndex,
        topPadding,
        bottomPadding,
    } = useFixedVirtualWindow(queue?.length ?? 0, QUEUE_ROW_HEIGHT);
    const totalDuration = useMemo(
        () => getTotalDuration(queue.map((item) => item.media)),
        [queue]
    );
    const queueFullyLoaded = rockIt.queueManager.isQueueFullyLoaded;

    const handleQueueScroll = (event: React.UIEvent<HTMLDivElement>): void => {
        const container = event.currentTarget;
        if (
            container.scrollHeight -
                container.scrollTop -
                container.clientHeight <
                QUEUE_ROW_HEIGHT * 8 &&
            rockIt.queueManager.hasNextQueuePage
        ) {
            void rockIt.queueManager.loadNextQueuePageAsync();
        }
        if (
            container.scrollTop < QUEUE_ROW_HEIGHT * 2 &&
            rockIt.queueManager.hasPreviousQueuePage
        ) {
            const previousHeight = container.scrollHeight;
            void rockIt.queueManager
                .loadPreviousQueuePageAsync()
                .then((): void => {
                    container.scrollTop +=
                        container.scrollHeight - previousHeight;
                });
        }
    };

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
                <p className="flex items-center gap-2 text-sm text-(--color-muted)">
                    <span>{rockIt.queueManager.queueTotalCount} canciones</span>
                    <DurationToggle durationMs={totalDuration} />
                </p>
            </div>

            <div
                ref={containerRef}
                onScroll={(event): void => {
                    onScroll(event);
                    handleQueueScroll(event);
                }}
                className="hide-scroll-thumb flex-1 overflow-y-auto pb-10"
            >
                <div style={{ height: topPadding }} />
                {queue
                    .slice(startIndex, endIndex)
                    .map((item: QueueItem, offset: number): JSX.Element => {
                        const index = startIndex + offset;
                        const playable = getPlayableMedia(item);
                        const isActive =
                            playable.publicId === currentMedia?.publicId;
                        return (
                            <QueueRow
                                key={`${item.queueMediaId}-${index}`}
                                media={playable}
                                canEdit={queueFullyLoaded}
                                index={index}
                                isActive={isActive}
                                isDragging={draggingIndex === index}
                                isDropTarget={
                                    overIndex === index &&
                                    draggingIndex !== index
                                }
                                registerRow={registerRow}
                                onDragHandlePointerDown={handlePointerDown(
                                    index
                                )}
                                onDelete={(): void => {
                                    if (queueFullyLoaded)
                                        removeFromQueue(index);
                                }}
                                onPlay={(): void => {
                                    playQueueItem(item.queueMediaId);
                                }}
                            />
                        );
                    })}
                <div style={{ height: bottomPadding }} />
                <AutoplayRecommendations />
            </div>
        </div>
    );
}
