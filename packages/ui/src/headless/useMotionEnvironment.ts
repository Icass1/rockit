"use client";

import { useEffect, useState } from "react";
import { AccessibilityInfo, AppState } from "@rockit/ui/runtime";

/** Decorative motion runs only in the foreground, after the OS preference is known. */
export function useMotionEnvironment(visible = true) {
    const [reduced, setReduced] = useState<boolean>();
    const [foreground, setForeground] = useState(
        AppState.currentState !== "background" &&
            AppState.currentState !== "inactive"
    );
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
            setForeground(value === "active")
        );
        return () => {
            live = false;
            motion?.remove();
            state?.remove();
        };
    }, []);
    return visible && foreground && reduced === false;
}
