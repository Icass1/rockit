import { useCallback, useEffect, useRef, useState } from "react";

const AUTO_ROTATE_INTERVAL = 3000;
const PAUSE_AFTER_INTERACTION = 2000;

export function useCarousel(length: number) {
    const [currentIndex, setCurrentIndex] = useState(0);
    const autoRotateRef = useRef<NodeJS.Timeout | null>(null);
    const pauseTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const touchStartX = useRef<number | null>(null);
    const touchEndX = useRef<number | null>(null);

    const stop = useCallback(() => {
        if (autoRotateRef.current) clearInterval(autoRotateRef.current);
        autoRotateRef.current = null;
    }, []);

    const start = useCallback(() => {
        if (!length) return;
        stop();
        autoRotateRef.current = setInterval(() => {
            setCurrentIndex((i) => (i < length - 1 ? i + 1 : 0));
        }, AUTO_ROTATE_INTERVAL);
    }, [length, stop]);

    const pauseAndResume = useCallback(() => {
        stop();
        if (pauseTimeoutRef.current) clearTimeout(pauseTimeoutRef.current);
        pauseTimeoutRef.current = setTimeout(start, PAUSE_AFTER_INTERACTION);
    }, [stop, start]);

    const next = useCallback(() => {
        setCurrentIndex((i) => (i < length - 1 ? i + 1 : 0));
        pauseAndResume();
    }, [length, pauseAndResume]);

    const prev = useCallback(() => {
        setCurrentIndex((i) => (i > 0 ? i - 1 : length - 1));
        pauseAndResume();
    }, [length, pauseAndResume]);

    const onTouchStart = useCallback((e: TouchEvent) => {
        touchStartX.current = e.touches[0].clientX;
    }, []);

    const onTouchMove = useCallback((e: TouchEvent) => {
        touchEndX.current = e.touches[0].clientX;
    }, []);

    const onTouchEnd = useCallback(() => {
        if (!touchStartX.current || !touchEndX.current) return;
        const distance = touchStartX.current - touchEndX.current;
        if (Math.abs(distance) > 50) {
            if (distance > 0) {
                next();
            } else {
                prev();
            }
        }
        touchStartX.current = null;
        touchEndX.current = null;
    }, [next, prev]);

    useEffect(() => {
        start();
        return () => {
            stop();
            if (pauseTimeoutRef.current) clearTimeout(pauseTimeoutRef.current);
        };
    }, [start, stop]);

    return { currentIndex, next, prev, onTouchStart, onTouchMove, onTouchEnd };
}