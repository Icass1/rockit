"use client";

import { useCallback, useSyncExternalStore, type JSX } from "react";
import type { BaseDynamicLyricsItem } from "@/dto";
import { lyricLineFillEnd, lyricWordFill } from "@/utils/lyricsTiming";
import type { ReadonlyAtom } from "@/lib/store";
import { HighlightedLyricWord } from "@/components/Lyrics/HighlightedLyricWord";

/** Only the active line subscribes to playback time. */
export function WordSyncedLine({
    line,
    clock,
    active,
    nextLineStart,
    offset = 0,
}: {
    line: BaseDynamicLyricsItem;
    clock: ReadonlyAtom<number | null>;
    active: boolean;
    nextLineStart?: number | null;
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
    const end = lyricLineFillEnd(line.end_timestamp_s, nextLineStart);
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
                        line.words?.[index + 1]?.timestamp_s ?? end
                    )}
                />
            ))}
        </>
    );
}
