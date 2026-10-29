/** One original-clock convention for highlight, preview and seeking. */
export function lyricPlaybackTime(timestamp: number, offset = 0): number {
    return timestamp - offset;
}
export function lyricSeekTime(timestamp: number, offset = 0): number {
    return Math.max(0, lyricPlaybackTime(timestamp, offset));
}
