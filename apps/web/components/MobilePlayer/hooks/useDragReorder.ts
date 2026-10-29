"use client";

import { useCallback, useRef, useState } from "react";

interface UseDragReorderReturn {
    draggingIndex: number | null;
    overIndex: number | null;
    registerRow: (index: number, el: HTMLElement | null) => void;
    handlePointerDown: (index: number) => (e: React.PointerEvent) => void;
    handlePointerMove: (e: React.PointerEvent) => void;
    handlePointerUp: () => void;
    handlePointerCancel: () => void;
}

/**
 * Lightweight, dependency-free drag-to-reorder for a vertical list.
 *
 * Design notes:
 * - No external DnD library. Uses native Pointer Events (~50 lines).
 * - The drag is only ever started from a dedicated "handle" element
 *   (see QueueRow's grip icon). Never attach handlePointerDown to the
 *   whole row — that would fight the row's onClick-to-play.
 * - This hook has no knowledge of "close the player" gestures. The Queue
 *   panel never shares gesture territory with the sheet's swipe-to-close
 *   handle, avoiding the "dragged a song, closed the whole player" bug.
 */
export function useDragReorder(
    itemCount: number,
    onReorder: (from: number, to: number) => void
): UseDragReorderReturn {
    const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
    const [overIndex, setOverIndex] = useState<number | null>(null);
    const rowRefs = useRef<Map<number, HTMLElement>>(new Map());

    const registerRow = useCallback((index: number, el: HTMLElement | null) => {
        if (el) rowRefs.current.set(index, el);
        else rowRefs.current.delete(index);
    }, []);

    const handlePointerDown = useCallback(
        (index: number) => (e: React.PointerEvent) => {
            e.preventDefault();
            (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
            setDraggingIndex(index);
            setOverIndex(index);
        },
        []
    );

    const handlePointerMove = useCallback(
        (e: React.PointerEvent) => {
            if (draggingIndex === null) return;
            const y = e.clientY;
            let closest: number | null = null;
            let closestDist = Infinity;
            rowRefs.current.forEach((el: HTMLElement, idx: number) => {
                const rect = el.getBoundingClientRect();
                const center = rect.top + rect.height / 2;
                const dist = Math.abs(center - y);
                if (dist < closestDist) {
                    closestDist = dist;
                    closest = idx;
                }
            });
            if (closest !== null) setOverIndex(closest);
        },
        [draggingIndex]
    );

    const endDrag = useCallback(() => {
        if (
            draggingIndex !== null &&
            overIndex !== null &&
            draggingIndex !== overIndex
        ) {
            onReorder(draggingIndex, overIndex);
        }
        setDraggingIndex(null);
        setOverIndex(null);
    }, [draggingIndex, overIndex, onReorder]);

    return {
        draggingIndex,
        overIndex,
        registerRow,
        handlePointerDown,
        handlePointerMove,
        handlePointerUp: endDrag,
        handlePointerCancel: endDrag,
    };
}
