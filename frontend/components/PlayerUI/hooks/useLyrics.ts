import { useEffect, useRef, useState } from "react";
import { useStore } from "@nanostores/react";
import { rockIt } from "@/lib/rockit/rockIt";

type LyricsTimestamp = { time: number; index: number };

type LyricsState =
    | { status: "idle" }
    | { status: "loading" }
    | { status: "empty" }
    | { status: "static"; lines: string[] }
    | { status: "dynamic"; lines: string[]; timestamps: LyricsTimestamp[] };

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
    const $currentSong = useStore(rockIt.queueManager.currentSongAtom);
    const $currentTime = useStore(rockIt.audioManager.currentTimeAtom);

    const [lyricsState, setLyricsState] = useState<LyricsState>(() => {
        if (!$currentSong?.publicId) return { status: "idle" };
        return { status: "loading" };
    });
    const [manualIndex, setManualIndex] = useState(0);

    // Ref so the keyboard handler never stales without re-subscribing
    const computedIndexRef = useRef(0);

    // --- Derived computed index ---
    const computedIndex =
        lyricsState.status === "dynamic" && $currentSong && $currentTime != null
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

        fetch(`/api/lyrics/${$currentSong.publicId}`)
            .then((res) => res.json())
            .then(
                (
                    data:
                        | { dynamicLyrics: false; lyrics: string }
                        | {
                              dynamicLyrics: true;
                              lyrics: { seconds: number; lyrics: string }[];
                          }
                ) => {
                    if (!data.lyrics) {
                        setLyricsState({ status: "empty" });
                        return;
                    }

                    if (data.dynamicLyrics) {
                        setLyricsState({
                            status: "dynamic",
                            lines: data.lyrics.map((l) => l.lyrics),
                            timestamps: data.lyrics.map((l, i) => ({
                                time: l.seconds,
                                index: i,
                            })),
                        });
                    } else {
                        setLyricsState({
                            status: "static",
                            lines: data.lyrics.split("\n"),
                        });
                    }
                }
            )
            .catch(() => {
                // Silently fall back — lyrics are non-critical
                setLyricsState({ status: "empty" });
            });
    }, [$currentSong?.publicId]);

    // --- Keyboard navigation ---
    // Depends only on `lyricsState` (not on computedIndex) to avoid
    // re-registering the handler on every audio frame tick.
    useEffect(() => {
        if (
            lyricsState.status !== "static" &&
            lyricsState.status !== "dynamic"
        ) {
            return;
        }

        const lineCount = lyricsState.lines.length;
        const timestamps =
            lyricsState.status === "dynamic" ? lyricsState.timestamps : [];

        const handleKey = (e: KeyboardEvent) => {
            if (e.code !== "ArrowDown" && e.code !== "ArrowUp") return;

            const current = computedIndexRef.current;
            const next =
                e.code === "ArrowDown"
                    ? Math.min(current + 1, lineCount - 1)
                    : Math.max(current - 1, 0);

            if (timestamps.length > 0) {
                rockIt.audioManager.setCurrentTime(
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
