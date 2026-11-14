"use client";

import { JSX, useCallback, useEffect, useId, useRef, useState } from "react";
import { useStore } from "@nanostores/react";
import { EMediaContextLocation } from "@rockit/shared";
import type { QueueDropTarget } from "@/models/interfaces/queueDropTarget";
import { useFixedVirtualWindow } from "@/hooks/useFixedVirtualWindow";
import { rockIt } from "@/lib/rockit/rockIt";
import MediaContextMenu from "@/components/MediaContextMenu/MediaContextMenu";
import { QueueMedia } from "@/components/PlayerUI/QueueMedia";
import { useVocabulary } from "@/components/providers/VocabularyProvider";
import AutoplayRecommendations from "@/components/Recommendations/AutoplayRecommendations";

const QUEUE_ROW_HEIGHT = 66;

export default function PlayerUIQueue({
    visible,
}: {
    visible: boolean;
}): JSX.Element {
    const vocabulary = useVocabulary();
    const helpId = useId();
    const [draggingId, setDraggingId] = useState<number | null>(null);
    const $queue = useStore(rockIt.queueManager.queueAtom);
    const $currentQueueMediaId = useStore(
        rockIt.queueManager.currentQueueMediaIdAtom
    );
    const $playerUIVisible = useStore(rockIt.playerUIManager.visibleAtom);
    const [reordering, setReordering] = useState(false);
    const draggedId = useRef<number | null>(null);

    const [dropTarget, setDropTarget] = useState<QueueDropTarget | null>(null);
    const {
        containerRef,
        onScroll,
        startIndex,
        endIndex,
        topPadding,
        bottomPadding,
    } = useFixedVirtualWindow($queue.length, QUEUE_ROW_HEIGHT);
    const queueContainerRef = useRef<HTMLDivElement>(null);
    const setQueueContainer = useCallback(
        (node: HTMLDivElement | null): void => {
            queueContainerRef.current = node;
            containerRef(node);
        },
        [containerRef]
    );
    const followTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const followDisabledRef = useRef(false);
    const isUserScrollingRef = useRef(false);
    const userScrollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
        null
    );

    useEffect(() => {
        if (
            !$currentQueueMediaId ||
            !queueContainerRef.current ||
            !$playerUIVisible
        )
            return;
        if (followDisabledRef.current || isUserScrollingRef.current) return;
        const el = queueContainerRef.current.querySelector(
            `[data-queue-media-id="${$currentQueueMediaId}"]`
        );
        if (el && visible) {
            const container = queueContainerRef.current;
            const element = el as HTMLElement;
            const elementHeight = element.offsetHeight;
            const containerHeight = container.clientHeight;
            const containerRect = container.getBoundingClientRect();
            const elementRect = element.getBoundingClientRect();
            const relativeTop =
                elementRect.top - containerRect.top + container.scrollTop;
            const scrollTo =
                relativeTop + elementHeight / 2 - containerHeight / 2;
            container.scrollTo({ top: scrollTo, behavior: "smooth" });
        } else if (visible) {
            const currentIndex = $queue.findIndex(
                (item) => item.queueMediaId === $currentQueueMediaId
            );
            queueContainerRef.current.scrollTo({
                top: Math.max(0, currentIndex) * QUEUE_ROW_HEIGHT,
                behavior: "smooth",
            });
        }
    }, [$currentQueueMediaId, $playerUIVisible, visible, $queue]);

    const markUserScrolling = (): void => {
        isUserScrollingRef.current = true;
        if (userScrollTimerRef.current)
            clearTimeout(userScrollTimerRef.current);
        userScrollTimerRef.current = setTimeout(() => {
            isUserScrollingRef.current = false;
        }, 200);
    };

    const handleScroll = (): void => {
        if (isUserScrollingRef.current) {
            followDisabledRef.current = true;
            if (followTimerRef.current) clearTimeout(followTimerRef.current);
            followTimerRef.current = setTimeout(() => {
                followDisabledRef.current = false;
            }, 10_000);
        }
    };

    const handleDragStart = (e: React.DragEvent, index: number): void => {
        if (reordering) {
            e.preventDefault();
            return;
        }
        if ((e.target as HTMLElement).closest("[data-queue-play-toggle]")) {
            e.preventDefault();
            return;
        }
        draggedId.current = $queue[index]?.queueMediaId ?? null;
        setDraggingId(draggedId.current);
        e.dataTransfer.setData(
            "application/x-rockit-queue",
            String(draggedId.current)
        );
        e.dataTransfer.effectAllowed = "move";
    };

    const targetAt = (
        event: React.DragEvent,
        index: number
    ): QueueDropTarget => {
        const rect = event.currentTarget.getBoundingClientRect();
        return {
            queueMediaId: $queue[index].queueMediaId,
            edge:
                event.clientY < rect.top + rect.height / 2 ? "before" : "after",
        };
    };
    const handleDragOver = (event: React.DragEvent, index: number): void => {
        if (draggedId.current === null) return;
        event.preventDefault();
        event.dataTransfer.dropEffect = "move";
        setDropTarget(targetAt(event, index));
    };
    const handleDragLeave = (): void => {
        setDropTarget(null);
    };
    const move = (fromId: number, target: QueueDropTarget): void => {
        if (reordering || fromId === target.queueMediaId) return;
        setReordering(true);
        void rockIt.queueManager
            .reorderQueueItemsAsync(fromId, target.queueMediaId, target.edge)
            .finally(() => setReordering(false));
    };
    const handleDrop = (event: React.DragEvent, index: number): void => {
        event.preventDefault();
        if (draggedId.current !== null)
            move(draggedId.current, targetAt(event, index));
        draggedId.current = null;
        setDraggingId(null);
        setDropTarget(null);
    };

    const handleClick = (queueMediaId: number): void => {
        rockIt.queueManager.setQueueMediaId(queueMediaId);
        rockIt.mediaPlayerManager.play();
    };

    return (
        <div
            aria-busy={reordering}
            data-queue-scroll
            ref={setQueueContainer}
            onScroll={(event): void => {
                onScroll(event);
                handleScroll();
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
            }}
            onPointerDown={markUserScrolling}
            onKeyDown={(event): void => {
                if (
                    [
                        "ArrowUp",
                        "ArrowDown",
                        "PageUp",
                        "PageDown",
                        "Home",
                        "End",
                        " ",
                    ].includes(event.key)
                )
                    markUserScrolling();
            }}
            onWheel={markUserScrolling}
            onTouchMove={markUserScrolling}
            className="flex h-full max-h-full min-h-0 w-full max-w-full min-w-0 flex-col overflow-y-auto mask-t-from-90% mask-b-from-90% py-16"
        >
            <p id={helpId} className="sr-only">
                {vocabulary.QUEUE_REORDER_HELP}
            </p>
            <div style={{ height: topPadding, flexShrink: 0 }} />
            {$queue
                .slice(startIndex, endIndex)
                .map((queueItem, offset): JSX.Element => {
                    const index = startIndex + offset;
                    return (
                        <div
                            key={queueItem.queueMediaId}
                            data-queue-media-id={queueItem.queueMediaId}
                            draggable={!reordering}
                            tabIndex={0}
                            aria-describedby={helpId}
                            onKeyDown={(event) => {
                                if (
                                    !event.altKey ||
                                    !["ArrowUp", "ArrowDown"].includes(
                                        event.key
                                    )
                                )
                                    return;
                                event.preventDefault();
                                event.stopPropagation();
                                const other =
                                    $queue[
                                        index +
                                            (event.key === "ArrowUp" ? -1 : 1)
                                    ];
                                if (other)
                                    move(queueItem.queueMediaId, {
                                        queueMediaId: other.queueMediaId,
                                        edge:
                                            event.key === "ArrowUp"
                                                ? "before"
                                                : "after",
                                    });
                            }}
                            onDragStart={(e): void => handleDragStart(e, index)}
                            onDragOver={(e): void => handleDragOver(e, index)}
                            onDragLeave={(event) => {
                                if (
                                    !(event.relatedTarget instanceof Node) ||
                                    !event.currentTarget.contains(
                                        event.relatedTarget
                                    )
                                )
                                    handleDragLeave();
                            }}
                            onDrop={(e): void => handleDrop(e, index)}
                            onDragEnd={() => {
                                draggedId.current = null;
                                setDraggingId(null);
                                handleDragLeave();
                            }}
                            className={`focus-visible:outline-primary relative shrink-0 border-t-2 border-transparent select-none [-webkit-touch-callout:none] focus-visible:outline-2 ${draggingId === queueItem.queueMediaId ? "opacity-40" : ""}`}
                        >
                            {dropTarget?.queueMediaId ===
                                queueItem.queueMediaId &&
                                draggingId !== queueItem.queueMediaId && (
                                    <div
                                        data-queue-insertion={dropTarget.edge}
                                        className={`bg-primary pointer-events-none absolute right-0 left-0 z-10 h-0.5 ${dropTarget.edge === "before" ? "top-0" : "bottom-0"}`}
                                    >
                                        <span className="bg-primary absolute top-1/2 left-0 h-2 w-2 -translate-y-1/2 rounded-full" />
                                        <span className="bg-primary text-primary-foreground absolute top-1/2 right-2 -translate-y-1/2 rounded px-2 text-xs">
                                            {vocabulary.QUEUE_DROP_HERE}
                                        </span>
                                    </div>
                                )}
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
                    );
                })}
            <div style={{ height: bottomPadding, flexShrink: 0 }} />

            <AutoplayRecommendations />
        </div>
    );
}
