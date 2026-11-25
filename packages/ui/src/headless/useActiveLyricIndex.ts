"use client";

import { useCallback, useSyncExternalStore } from "react";
import { lyricPlaybackTime, type ReadonlyAtom } from "@rockit/shared";

const EMPTY_LINES: readonly { timestamp_s: number | null }[] = [];
const serverSnapshot = (): number => -1;

/** Subscribe to the active line, not every clock sample. Preserve reviewed offsets. */
export function useActiveLyricIndex(
    clock: ReadonlyAtom<number | null>,
    lines: readonly { timestamp_s: number | null }[] = EMPTY_LINES,
    offset = 0
): number {
    const snapshot = useCallback((): number => {
        const time = clock.get();
        if (time === null || !Number.isFinite(time)) return -1;
        for (let index = lines.length - 1; index >= 0; index--) {
            const timestamp = lines[index].timestamp_s;
            if (
                timestamp !== null &&
                time >= lyricPlaybackTime(timestamp, offset)
            )
                return index;
        }
        return -1;
    }, [clock, lines, offset]);
    const subscribe = useCallback(
        (notify: () => void): (() => void) => clock.listen(notify),
        [clock]
    );
    return useSyncExternalStore(subscribe, snapshot, serverSnapshot);
}
