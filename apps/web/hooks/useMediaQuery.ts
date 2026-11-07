"use client";

import { useCallback, useSyncExternalStore } from "react";

/** Match the server snapshot during hydration, then subscribe to browser preferences. */
export function useMediaQuery(query: string, serverSnapshot = false): boolean {
    const subscribe = useCallback(
        (listener: () => void) => {
            const media = window.matchMedia(query);
            media.addEventListener("change", listener);
            return () => media.removeEventListener("change", listener);
        },
        [query]
    );
    const getSnapshot = useCallback(
        () => window.matchMedia(query).matches,
        [query]
    );
    return useSyncExternalStore(subscribe, getSnapshot, () => serverSnapshot);
}
