"use client";

import { useEffect, useMemo, useState } from "react";

/*
 * Incremental list rendering that scales to libraries of any size.
 *
 * For small lists (fewer than `threshold` items) everything renders at once,
 * so the overhead is zero. For large lists the items are revealed in batches
 * as the user scrolls toward a sentinel (driven by `sentinelInView`, read from
 * a `useInView` call in the consuming component).
 *
 * Returns a stable subset of `items`.
 */
export function useIncrementalList<T>(
    items: readonly T[],
    sentinelInView: boolean,
    batchSize: number = 50,
    threshold: number = 200
): T[] {
    const [itemCount, setItemCount] = useState<number>(() =>
        Math.min(items.length, threshold)
    );

    // Reset the revealed count whenever the underlying list identity changes
    // (filter, search, tab). Compare by reference when possible.
    const [previousItems, setPreviousItems] = useState(items);
    if (previousItems !== items) {
        setPreviousItems(items);
        setItemCount(Math.min(items.length, threshold));
    }

    // Reveal the next batch when the sentinel scrolls into view.
    useEffect((): (() => void) | void => {
        if (!sentinelInView) return;
        const frame = requestAnimationFrame(() => {
            setItemCount((count): number => {
                if (count >= items.length) return count;
                return Math.min(items.length, count + batchSize);
            });
        });
        return () => cancelAnimationFrame(frame);
    }, [sentinelInView, items.length, batchSize]);

    // First batch of items is rendered immediately so the viewport fills fast.
    return useMemo((): T[] => items.slice(0, itemCount), [items, itemCount]);
}
