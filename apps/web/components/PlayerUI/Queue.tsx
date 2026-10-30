"use client";

import { JSX, useCallback, useEffect, useRef, useState } from "react";
import { useStore } from "@nanostores/react";
import { EMediaContextLocation } from "@rockit/shared";
import { useFixedVirtualWindow } from "@/hooks/useFixedVirtualWindow";
import { rockIt } from "@/lib/rockit/rockIt";
import MediaContextMenu from "@/components/MediaContextMenu/MediaContextMenu";
import { QueueMedia } from "@/components/PlayerUI/QueueMedia";
import AutoplayRecommendations from "@/components/Recommendations/AutoplayRecommendations";

const QUEUE_ROW_HEIGHT = 66;

export default function PlayerUIQueue({
    visible,
}: {
    visible: boolean;
}): JSX.Element {
    const $queue = useStore(rockIt.queueManager.queueAtom);
    const $currentQueueMediaId = useStore(
        rockIt.queueManager.currentQueueMediaIdAtom
    );
    const $playerUIVisible = useStore(rockIt.playerUIManager.visibleAtom);
    const queueFullyLoaded = rockIt.queueManager.isQueueFullyLoaded;

    const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
    const virtualWindow = useFixedVirtualWindow(
        $queue.length,
        QUEUE_ROW_HEIGHT
    );
    const queueContainerRef = useRef<HTMLDivElement>(null);
    const setQueueContainer = useCallback(
        (node: HTMLDivElement | null): void => {
            queueContainerRef.current = node;
            virtualWindow.containerRef(node);
        },
        [virtualWindow.containerRef]
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
        if (followDisabledRef.current) return;
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
        if (!queueFullyLoaded) {
            e.preventDefault();
            return;
        }
        if ((e.target as HTMLElement).closest("[data-queue-play-toggle]")) {
            e.preventDefault();
            return;
        }
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
        if (!queueFullyLoaded) return;
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
            ref={setQueueContainer}
            onScroll={(event): void => {
                virtualWindow.onScroll(event);
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
            onWheel={markUserScrolling}
            onTouchMove={markUserScrolling}
            className="flex h-full max-h-full min-h-0 w-full max-w-full min-w-0 flex-col overflow-y-auto mask-t-from-90% mask-b-from-90% py-16"
            style={{ scrollBehavior: "smooth" }}
        >
            <div style={{ height: virtualWindow.topPadding, flexShrink: 0 }} />
            {$queue
                .slice(virtualWindow.startIndex, virtualWindow.endIndex)
                .map((queueItem, offset): JSX.Element => {
                    const index = virtualWindow.startIndex + offset;
                    return (
                        <div
                            key={queueItem.queueMediaId}
                            data-queue-media-id={queueItem.queueMediaId}
                            draggable={queueFullyLoaded}
                            onDragStart={(e): void => handleDragStart(e, index)}
                            onDragOver={(e): void => handleDragOver(e, index)}
                            onDragLeave={handleDragLeave}
                            onDrop={(e): void => handleDrop(e, index)}
                            onDragEnd={handleDragLeave}
                            className={`shrink-0 border-t-2 select-none [-webkit-touch-callout:none] ${
                                dragOverIndex === index
                                    ? "border-(--color-rockit-pink)"
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
                    );
                })}
            <div
                style={{ height: virtualWindow.bottomPadding, flexShrink: 0 }}
            />

            <AutoplayRecommendations />
        </div>
    );
}
