import type { TMediaWithSearch } from "@rockit/shared";
import type { LibraryDragMedia } from "@/models/interfaces/libraryDragDrop";

export function isLibraryDragSource(
    media: TMediaWithSearch
): media is LibraryDragMedia {
    return (
        (media.type === "song" || media.type === "album") &&
        "publicId" in media &&
        typeof media.publicId === "string" &&
        media.publicId.length > 0
    );
}

export function dragThresholdReached(
    startX: number,
    startY: number,
    x: number,
    y: number
): boolean {
    return Math.hypot(x - startX, y - startY) >= 8;
}

export function dragScrollSpeed(
    pointer: number,
    top: number,
    bottom: number
): number {
    if (pointer < top || pointer > bottom) return 0;
    if (pointer < top + 44) return -Math.min(14, (top + 44 - pointer) * 0.35);
    if (pointer > bottom - 44)
        return Math.min(14, (pointer - bottom + 44) * 0.35);
    return 0;
}
