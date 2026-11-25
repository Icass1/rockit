"use client";

import { useCallback, useSyncExternalStore, type JSX } from "react";
import type { BaseDynamicLyricsItem } from "@/dto";
import { lyricWordFill } from "@/utils/lyricsTiming";
import type { ReadonlyAtom } from "@/lib/store";
import { HighlightedLyricWord } from "@/components/Lyrics/HighlightedLyricWord";

/** Only the active line subscribes to playback time. */
export function WordSyncedLine({
    line,
    clock,
    active,
    offset = 0,
}: {
    line: BaseDynamicLyricsItem;
    clock: ReadonlyAtom<number | null>;
    active: boolean;
    offset?: number;
}): JSX.Element {
    const snapshot = useCallback(
        () => (active ? clock.get() : null),
        [active, clock]
    );
    const subscribe = useCallback(
        (notify: () => void) =>
            active && line.words?.length ? clock.listen(notify) : () => {},
        [active, clock, line.words?.length]
    );
    const time = useSyncExternalStore(subscribe, snapshot, () => null);
    if (!active || time === null || !line.words?.length)
        return <>{line.text}</>;
    return (
        <>
            {line.words.map((word, index) => (
                <HighlightedLyricWord
                    key={index}
                    text={word.text}
                    fill={lyricWordFill(
                        word,
                        time,
                        offset,
                        line.words?.[index + 1]?.timestamp_s ??
                            line.end_timestamp_s
                    )}
                />
            ))}
        </>
    );
}
