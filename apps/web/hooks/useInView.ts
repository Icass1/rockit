"use client";

import { useEffect, useRef, useState, type RefObject } from "react";

export function useInView<T extends HTMLElement>(
    options?: IntersectionObserverInit
): [RefObject<T | null>, boolean] {
    const ref = useRef<T>(null);
    const [inView, setInView] = useState(false);

    useEffect((): (() => void) | void => {
        const node = ref.current;
        if (!node || inView) return;

        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setInView(true);
                    observer.disconnect();
                }
            },
            { threshold: 0.1, rootMargin: "60px", ...options }
        );

        observer.observe(node);
        return () => observer.disconnect();
    }, [inView]);

    return [ref, inView];
}
