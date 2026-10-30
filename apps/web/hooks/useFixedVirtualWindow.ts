"use client";

import { useCallback, useEffect, useState, type UIEvent } from "react";

interface VirtualWindow {
    startIndex: number;
    endIndex: number;
    topPadding: number;
    bottomPadding: number;
    containerRef: (node: HTMLElement | null) => void;
    onScroll: (event: UIEvent<HTMLElement>) => void;
}

/** Render only the visible rows and a small buffer for a fixed-height list. */
export function useFixedVirtualWindow(
    itemCount: number,
    itemHeight: number,
    overscan: number = 8
): VirtualWindow {
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

    const startIndex = Math.max(
        0,
        Math.floor(scrollTop / itemHeight) - overscan
    );
    const visibleCount = Math.ceil(viewportHeight / itemHeight) + overscan * 2;
    const endIndex = Math.min(itemCount, startIndex + visibleCount);

    return {
        startIndex,
        endIndex,
        topPadding: startIndex * itemHeight,
        bottomPadding: Math.max(0, (itemCount - endIndex) * itemHeight),
        containerRef,
        onScroll,
    };
}
