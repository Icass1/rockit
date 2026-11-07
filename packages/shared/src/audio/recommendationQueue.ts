import type { SongListResponse } from "@/dto";
import type { AutoplayRecommendation } from "@/models/types/autoplayRecommendation";

/** External discoveries take priority; local songs are the fallback. */
export function buildRecommendationQueue(
    result: SongListResponse,
    excluded: Set<string>
): AutoplayRecommendation[] {
    const seen = new Set(excluded);
    const discoveries: AutoplayRecommendation[] = [];
    for (const item of result.discover) {
        if (item.publicId && seen.has(item.publicId)) continue;
        if (item.publicId) seen.add(item.publicId);
        discoveries.push({ kind: "discover", item });
    }
    if (discoveries.length > 0) return discoveries;
    const songs: AutoplayRecommendation[] = [];
    for (const song of result.songs) {
        if (seen.has(song.publicId)) continue;
        seen.add(song.publicId);
        songs.push({ kind: "song", song });
    }
    return songs;
}

/** The real queue also occupies the two-song lookahead window. */
export function recommendationWindowSize(remainingQueueSongs: number): number {
    return Math.max(0, 2 - Math.max(0, remainingQueueSongs));
}
