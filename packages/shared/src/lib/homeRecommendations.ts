import type { BaseSongWithAlbumResponse } from "@/dto";

/** Keep familiar choices alongside discovery, without repeating cards. */
export function mixHomeRecommendations(
    recommended: BaseSongWithAlbumResponse[],
    familiar: BaseSongWithAlbumResponse[]
): BaseSongWithAlbumResponse[] {
    const songs: BaseSongWithAlbumResponse[] = [];
    const seen = new Set<string>();
    for (
        let index = 0;
        index < Math.max(recommended.length, familiar.length);
        index++
    ) {
        for (const song of [recommended[index], familiar[index]]) {
            if (!song || seen.has(song.publicId)) continue;
            seen.add(song.publicId);
            songs.push(song);
        }
    }
    return songs;
}
