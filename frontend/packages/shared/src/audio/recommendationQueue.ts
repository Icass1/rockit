import type { SongListResponse } from "@/dto";
import type { AutoplayRecommendation } from "@/models/types/autoplayRecommendation";

/** Two local picks for each discovery pick keep a playable fallback nearby. */
export function buildRecommendationQueue(
    result: SongListResponse,
    excluded: Set<string>
): AutoplayRecommendation[] {
    const songs = result.songs.filter((song) => !excluded.has(song.publicId));
    const discoveries = result.discover.filter(
        (item) => !item.publicId || !excluded.has(item.publicId)
    );
    const items: AutoplayRecommendation[] = [];
    const seen = new Set(excluded);
    let songIndex = 0;
    let discoverIndex = 0;
    while (songIndex < songs.length || discoverIndex < discoveries.length) {
        for (let count = 0; count < 2 && songIndex < songs.length; count++) {
            const song = songs[songIndex++];
            if (seen.has(song.publicId)) continue;
            seen.add(song.publicId);
            items.push({ kind: "song", song });
        }
        const item = discoveries[discoverIndex++];
        if (item && (!item.publicId || !seen.has(item.publicId))) {
            if (item.publicId) seen.add(item.publicId);
            items.push({ kind: "discover", item });
        }
    }
    return items;
}

/** The real queue also occupies the two-song lookahead window. */
export function recommendationWindowSize(remainingQueueSongs: number): number {
    return Math.max(0, 2 - Math.max(0, remainingQueueSongs));
}
