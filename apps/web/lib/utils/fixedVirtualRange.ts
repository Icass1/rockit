import type { FixedVirtualRange } from "@/models/interfaces/fixedVirtualWindow";

/** Keep queue geometry fixed even when the viewport reaches a non-virtual footer. */
export function getFixedVirtualRange(
    itemCount: number,
    itemHeight: number,
    viewportHeight: number,
    scrollTop: number,
    overscan = 8
): FixedVirtualRange {
    const startIndex = Math.min(
        itemCount,
        Math.max(0, Math.floor(scrollTop / itemHeight) - overscan)
    );
    const visibleCount = Math.ceil(viewportHeight / itemHeight) + overscan * 2;
    const endIndex = Math.min(itemCount, startIndex + visibleCount);
    return {
        startIndex,
        endIndex,
        topPadding: startIndex * itemHeight,
        bottomPadding: (itemCount - endIndex) * itemHeight,
    };
}
