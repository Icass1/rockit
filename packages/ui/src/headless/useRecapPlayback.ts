"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AccessibilityInfo, AppState } from "@rockit/ui/runtime";

/** Only UI state. Stops when hidden and never touches the music transport. */
export function useRecapPlayback(count: number) {
    const [index, setIndex] = useState(0);
    const [started, setStarted] = useState(false);
    const [paused, setPaused] = useState(false);
    const [held, setHeld] = useState(false);
    const [active, setActive] = useState(
        AppState.currentState !== "background" &&
            AppState.currentState !== "inactive"
    );
    const [reduced, setReduced] = useState<boolean | undefined>();
    useEffect(() => {
        let live = true;
        void AccessibilityInfo.isReduceMotionEnabled()
            .then((value) => {
                if (live) setReduced(value);
            })
            .catch(() => {
                if (live) setReduced(true);
            });
        const motion = AccessibilityInfo.addEventListener(
            "reduceMotionChanged",
            setReduced
        );
        const state = AppState.addEventListener("change", (value) =>
            setActive(value === "active")
        );
        return () => {
            live = false;
            motion.remove();
            state.remove();
        };
    }, []);
    const next = useCallback(() => {
        setStarted(true);
        setIndex((value) => Math.max(0, Math.min(count - 1, value + 1)));
    }, [count]);
    const previous = useCallback(
        () => setIndex((value) => Math.max(0, value - 1)),
        []
    );
    const toggle = useCallback(() => setPaused((value) => !value), []);
    const restart = useCallback(() => {
        setIndex(0);
        setStarted(false);
        setPaused(false);
        setHeld(false);
    }, []);
    return {
        index,
        next,
        previous,
        toggle,
        restart,
        held: setHeld,
        paused,
        reduced: reduced === true,
        running:
            started &&
            !paused &&
            !held &&
            active &&
            reduced === false &&
            index < count - 1,
    };
}

/** The clock lives only in the progress strip: artwork/text do not rerender every tick. */
export function useRecapClock(
    running: boolean,
    duration: number,
    tick: number,
    complete: () => void
) {
    const elapsed = useRef(0),
        callback = useRef(complete);
    callback.current = complete;
    const [progress, setProgress] = useState(0);
    useEffect(() => {
        if (!running) return;
        let last = performance.now();
        const timer = setInterval(() => {
            const now = performance.now();
            // Suspension must not fast-forward through stories on unlock.
            elapsed.current += Math.min(now - last, tick * 4);
            last = now;
            setProgress(Math.min(1, elapsed.current / duration));
            if (elapsed.current >= duration) {
                clearInterval(timer);
                callback.current();
            }
        }, tick);
        return () => clearInterval(timer);
    }, [running, duration, tick]);
    return progress;
}
