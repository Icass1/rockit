import type { LyricsWord } from "@/dto";

/** One original-clock convention for highlight, preview and seeking. */
export function lyricPlaybackTime(timestamp: number, offset = 0): number {
    return timestamp - offset;
}
export function lyricSeekTime(timestamp: number, offset = 0): number {
    return Math.max(0, lyricPlaybackTime(timestamp, offset));
}

/** A line may finish early, but its fill cannot run into the following line. */
export function lyricLineFillEnd(
    lineEnd?: number | null,
    nextLineStart?: number | null
): number | undefined {
    if (lineEnd == null) return nextLineStart ?? undefined;
    return Math.min(lineEnd, nextLineStart ?? lineEnd);
}

export function lyricWordState(
    word: LyricsWord,
    time: number | null | undefined,
    offset = 0,
    nextBoundary?: number | null
): "future" | "active" | "past" {
    const fill = lyricWordFill(word, time, offset, nextBoundary);
    return typeof fill === "number" ? "active" : fill;
}

/** Finish a word by the next word or line boundary, even when timings overlap. */
export function lyricWordFill(
    word: LyricsWord,
    time: number | null | undefined,
    offset = 0,
    nextBoundary?: number | null
): "future" | "past" | number {
    const start = lyricPlaybackTime(word.timestamp_s, offset);
    if (time == null || !Number.isFinite(time) || time < start) return "future";

    const end = lyricPlaybackTime(
        Math.min(word.end_timestamp_s ?? Infinity, nextBoundary ?? Infinity),
        offset
    );
    if (time >= end) return "past";
    return Number.isFinite(end) ? (time - start) / (end - start) : 1;
}
