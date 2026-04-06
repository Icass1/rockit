import { useEffect, useRef, useState } from "react";
import { useStore } from "@nanostores/react";
import { ELyricsStatus } from "@/models/enums/lyricsStatus";
import { TLyricsState } from "@/models/interfaces/lyrics";
import { rockIt } from "@/lib/rockit/rockIt";

/**
 * Fetches lyrics for the current song and handles keyboard navigation.
 *
 * Returns:
 * - `lyricsState` — union type describing what to render
 * - `manualIndex` — current line controlled by keyboard / scroll
 * - `setManualIndex` — setter for scroll-driven manual index
 * - `computedIndex` — resolved index (timestamps > manual for dynamic lyrics)
 */
export function useLyrics() {
    const $currentSong = useStore(rockIt.queueManager.currentMediaAtom);
    const $currentTime = useStore(rockIt.mediaPlayerManager.currentTimeAtom);

    const [lyricsState, _setLyricsState] = useState<TLyricsState>(() => {
        if (!$currentSong?.publicId) return { status: ELyricsStatus.Idle };
        return { status: ELyricsStatus.Loading };
    });
    const [manualIndex, setManualIndex] = useState(0);

    // Ref so the keyboard handler never stales without re-subscribing
    const computedIndexRef = useRef(0);

    // --- Derived computed index ---
    const computedIndex =
        lyricsState.status === ELyricsStatus.Dynamic &&
        $currentSong &&
        $currentTime != null
            ? (lyricsState.timestamps
                  .toSorted((a, b) => b.time - a.time)
                  .find((ts) => ts.time < $currentTime + 0.5)?.index ?? 0)
            : manualIndex;

    // Keep ref in sync so keyboard handler always reads latest value
    useEffect(() => {
        computedIndexRef.current = computedIndex;
    }, [computedIndex]);

    // --- Reset manual index when song changes ---
    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setManualIndex(0);
    }, [$currentSong?.publicId]);

    // --- Fetch lyrics when song changes ---
    useEffect(() => {
        if (!$currentSong?.publicId) return;

        // fetch(`lyrics/${$currentSong.publicId}`)
        //     .then((res) => res.json())
        //     .then(
        //         (
        //             data:
        //                 | { dynamicLyrics: false; lyrics: string }
        //                 | {
        //                       dynamicLyrics: true;
        //                       lyrics: { seconds: number; lyrics: string }[];
        //                   }
        //         ) => {
        //             if (!data.lyrics) {
        //                 setLyricsState({ status: "empty" });
        //                 return;
        //             }

        //             if (data.dynamicLyrics) {
        //                 setLyricsState({
        //                     status: "dynamic",
        //                     lines: data.lyrics.map((l) => l.lyrics),
        //                     timestamps: data.lyrics.map((l, i) => ({
        //                         time: l.seconds,
        //                         index: i,
        //                     })),
        //                 });
        //             } else {
        //                 setLyricsState({
        //                     status: "static",
        //                     lines: data.lyrics.split("\n"),
        //                 });
        //             }
        //         }
        //     )
        //     .catch(() => {
        //         // Silently fall back — lyrics are non-critical
        //         setLyricsState({ status: "empty" });
        //     });
    }, [$currentSong?.publicId]);

    // --- Keyboard navigation ---
    // Depends only on `lyricsState` (not on computedIndex) to avoid
    // re-registering the handler on every audio frame tick.
    useEffect(() => {
        if (
            lyricsState.status !== ELyricsStatus.Static &&
            lyricsState.status !== ELyricsStatus.Dynamic
        ) {
            return;
        }

        const lineCount = lyricsState.lines.length;
        const timestamps =
            lyricsState.status === ELyricsStatus.Dynamic
                ? lyricsState.timestamps
                : [];

        const handleKey = (e: KeyboardEvent) => {
            if (e.code !== "ArrowDown" && e.code !== "ArrowUp") return;

            const current = computedIndexRef.current;
            const next =
                e.code === "ArrowDown"
                    ? Math.min(current + 1, lineCount - 1)
                    : Math.max(current - 1, 0);

            if (timestamps.length > 0) {
                rockIt.mediaPlayerManager.setCurrentTime(
                    timestamps[next].time + 0.01
                );
            }

            setManualIndex(next);
        };

        document.addEventListener("keyup", handleKey);
        return () => document.removeEventListener("keyup", handleKey);
    }, [lyricsState]);

    return { lyricsState, manualIndex, setManualIndex, computedIndex };
}
