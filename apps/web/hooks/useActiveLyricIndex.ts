"use client";

import { useCallback, useSyncExternalStore } from "react";
import type { BaseDynamicLyricsResponse } from "@/dto";
import { lyricPlaybackTime } from "@/utils/lyricsTiming";
import type { ReadonlyAtom } from "@/lib/store";

const EMPTY_LINES: BaseDynamicLyricsResponse["lines"] = [];
const serverSnapshot = (): number => -1;

/** Subscribe to the active line, not every clock sample. Preserve reviewed offsets. */
export function useActiveLyricIndex(
    clock: ReadonlyAtom<number | null>,
    lines: BaseDynamicLyricsResponse["lines"] = EMPTY_LINES,
    offset = 0
): number {
    const snapshot = useCallback((): number => {
        const time = clock.get();
        if (time === null || !Number.isFinite(time)) return -1;
        for (let index = lines.length - 1; index >= 0; index--)
            if (time >= lyricPlaybackTime(lines[index].timestamp_s, offset))
                return index;
        return -1;
    }, [clock, lines, offset]);
    const subscribe = useCallback(
        (notify: () => void): (() => void) => clock.listen(notify),
        [clock]
    );
    return useSyncExternalStore(subscribe, snapshot, serverSnapshot);
}
