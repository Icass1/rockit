import { useEffect, useRef, useState } from "react";
import { QueueResponseItem } from "@/dto";
import { IDraggingMedia } from "@/models/interfaces/draggingMedia";

/**
 * Shared drag-and-drop logic for queue lists.
 * Used by PlayerUIQueueList (desktop) and MobilePlayerUIQueue (mobile).
 *
 * @param containerOffsetFromTop - Distance in px from screen top to the queue container.
 *   Translates raw clientY into a position relative to the list. Default: 185.
 */
export function useQueueDrag(containerOffsetFromTop = 185) {
    const [draggingMedia, setDraggingMedia] = useState<
        IDraggingMedia | undefined
    >();
    const [draggingPosY, setDraggingPosY] = useState(0);
    const draggingPosYRef = useRef(0);

    const startDrag = (
        clientY: number,
        media: QueueResponseItem,
        index: number,
        list = "queue"
    ) => {
        setDraggingMedia({ list, media, index });
        setDraggingPosY(clientY);
        draggingPosYRef.current = clientY;
    };

    useEffect(() => {
        if (!draggingMedia) return;

        const updatePos = (clientY: number) => {
            const rounded = Math.round(clientY * 100) / 100;
            setDraggingPosY(rounded);
            draggingPosYRef.current = rounded;
        };

        const handleMouseMove = (e: MouseEvent) => updatePos(e.clientY);
        const handleTouchMove = (e: TouchEvent) =>
            updatePos(e.touches[0].clientY);
        // TODO: implement reorder when queueManager.reorderQueue is available
        const handleEnd = () => setDraggingMedia(undefined);

        document.addEventListener("mousemove", handleMouseMove);
        document.addEventListener("mouseup", handleEnd);
        document.addEventListener("touchmove", handleTouchMove, {
            passive: true,
        });
        document.addEventListener("touchend", handleEnd);

        return () => {
            document.removeEventListener("mousemove", handleMouseMove);
            document.removeEventListener("mouseup", handleEnd);
            document.removeEventListener("touchmove", handleTouchMove);
            document.removeEventListener("touchend", handleEnd);
        };
    }, [draggingMedia]);

    /**
     * Returns the `top` pixel value for a queue item given the current drag state.
     * Call this in the render loop for each item.
     */
    const calcItemTop = (
        index: number,
        media: QueueResponseItem,
        scrollTop: number
    ): number => {
        if (!draggingMedia) return index * 64;

        const draggingTop = Math.max(
            draggingPosY - containerOffsetFromTop + scrollTop,
            0
        );

        if (draggingMedia.media.media.publicId === media.media.publicId) {
            return draggingTop;
        }

        let top = index * 64;

        if (draggingTop - 32 < top && draggingMedia.index * 64 > top) {
            top += 64;
        }
        if (draggingTop + 32 > top && draggingMedia.index * 64 < top) {
            top -= 64;
        }

        return top;
    };

    return { draggingMedia, draggingPosY, startDrag, calcItemTop };
}
