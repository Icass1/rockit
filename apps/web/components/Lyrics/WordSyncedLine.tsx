"use client";

import { useCallback, useSyncExternalStore, type JSX } from "react";
import type { BaseDynamicLyricsItem } from "@/dto";
import { lyricWordState } from "@/utils/lyricsTiming";
import type { ReadonlyAtom } from "@/lib/store";

/** Only the active line listens to word boundaries; clock samples do not rerender the player. */
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
        () =>
            active
                ? (line.words ?? [])
                      .map((word, index) =>
                          lyricWordState(
                              word,
                              clock.get(),
                              offset,
                              line.words?.[index + 1]?.timestamp_s ??
                                  line.end_timestamp_s
                          )
                      )
                      .join(",")
                : "",
        [active, clock, line, offset]
    );
    const subscribe = useCallback(
        (notify: () => void) =>
            active && line.words?.length ? clock.listen(notify) : () => {},
        [active, clock, line.words?.length]
    );
    const states = useSyncExternalStore(subscribe, snapshot, () => "").split(
        ","
    );
    if (!active || !line.words?.length) return <>{line.text}</>;
    return (
        <>
            {(line.words ?? []).map((word, index) => (
                <span
                    key={index}
                    data-word-state={states[index] || "future"}
                    className={
                        states[index] === "active"
                            ? "text-primary"
                            : states[index] === "past"
                              ? "text-foreground-strong"
                              : "text-muted-foreground"
                    }
                >
                    {word.text}
                </span>
            ))}
        </>
    );
}
