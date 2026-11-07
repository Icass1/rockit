"use client";

import { useCallback, useEffect, useState, type UIEvent } from "react";
import type { FixedVirtualWindow } from "@/models/interfaces/fixedVirtualWindow";
import { getFixedVirtualRange } from "@/lib/utils/fixedVirtualRange";

/** Render only the visible rows and a small buffer for a fixed-height list. */
export function useFixedVirtualWindow(
    itemCount: number,
    itemHeight: number,
    overscan: number = 8
): FixedVirtualWindow {
    const [scrollTop, setScrollTop] = useState(0);
    const [viewportHeight, setViewportHeight] = useState(0);

    const onScroll = useCallback((event: UIEvent<HTMLElement>): void => {
        setScrollTop(event.currentTarget.scrollTop);
    }, []);

    const measure = useCallback((element: HTMLElement | null): (() => void) => {
        if (!element) return () => undefined;
        const update = (): void => setViewportHeight(element.clientHeight);
        update();
        const observer = new ResizeObserver(update);
        observer.observe(element);
        return () => observer.disconnect();
    }, []);

    const [element, setElement] = useState<HTMLElement | null>(null);
    const containerRef = useCallback((node: HTMLElement | null): void => {
        setElement(node);
    }, []);

    useEffect(() => measure(element), [element, measure]);

    return {
        ...getFixedVirtualRange(
            itemCount,
            itemHeight,
            viewportHeight,
            scrollTop,
            overscan
        ),
        containerRef,
        onScroll,
    };
}
