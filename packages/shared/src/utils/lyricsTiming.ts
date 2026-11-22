import type { LyricsWord } from "@/dto";

/** One original-clock convention for highlight, preview and seeking. */
export function lyricPlaybackTime(timestamp: number, offset = 0): number {
    return timestamp - offset;
}
export function lyricSeekTime(timestamp: number, offset = 0): number {
    return Math.max(0, lyricPlaybackTime(timestamp, offset));
}

/** Missing ends use the next segment or line end only for display. */
export function lyricWordState(
    word: LyricsWord,
    time: number | null | undefined,
    offset = 0,
    fallbackEnd?: number | null
): "future" | "active" | "past" {
    if (
        time == null ||
        !Number.isFinite(time) ||
        time < lyricPlaybackTime(word.timestamp_s, offset)
    )
        return "future";
    const end = word.end_timestamp_s ?? fallbackEnd;
    return end != null && time >= lyricPlaybackTime(end, offset)
        ? "past"
        : "active";
}
