import { useCallback, useEffect, useRef, useState } from "react";

const ADVANCE_INTERVAL = 5000;
const RESUME_DELAY = 3000;

interface UseCoverflowOptions {
    length: number;
    reducedMotion?: boolean;
}

export function useCoverflow({
    length,
    reducedMotion = false,
}: UseCoverflowOptions): {
    center: number;
    next: () => void;
    prev: () => void;
    goTo: (index: number) => void;
    startAuto: () => void;
    stopAuto: () => void;
} {
    const [center, setCenter] = useState(0);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const resumeRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const clearTimers = useCallback((): void => {
        if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
        }
        if (resumeRef.current) {
            clearTimeout(resumeRef.current);
            resumeRef.current = null;
        }
    }, []);

    const startAuto = useCallback((): void => {
        if (reducedMotion || !length) return;
        clearTimers();
        timerRef.current = setInterval(() => {
            setCenter((i) => (i + 1) % length);
        }, ADVANCE_INTERVAL);
    }, [reducedMotion, length, clearTimers]);

    const stopAuto = useCallback((): void => {
        if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
        }
    }, []);

    const pauseAndResume = useCallback((): void => {
        stopAuto();
        if (resumeRef.current) clearTimeout(resumeRef.current);
        resumeRef.current = setTimeout(startAuto, RESUME_DELAY);
    }, [stopAuto, startAuto]);

    const next = useCallback((): void => {
        setCenter((i) => (i + 1) % length);
        pauseAndResume();
    }, [length, pauseAndResume]);

    const prev = useCallback((): void => {
        setCenter((i) => (i - 1 + length) % length);
        pauseAndResume();
    }, [length, pauseAndResume]);

    const goTo = useCallback(
        (index: number): void => {
            setCenter(index);
            pauseAndResume();
        },
        [pauseAndResume]
    );

    useEffect(() => {
        startAuto();
        return clearTimers;
    }, [startAuto, clearTimers]);

    return { center, next, prev, goTo, startAuto, stopAuto };
}
