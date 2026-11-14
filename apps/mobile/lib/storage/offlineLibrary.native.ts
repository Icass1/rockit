import type { BaseSongWithAlbumResponse } from "@rockit/shared";
import { mediaStorage } from "@/lib/storage/mediaStorage";

export async function listOfflineLibrarySongs(
    candidates: BaseSongWithAlbumResponse[]
): Promise<BaseSongWithAlbumResponse[]> {
    const saved = await Promise.all(
        candidates.map((song) => mediaStorage.hasMedia(song.publicId))
    );
    return candidates.filter((_, index) => saved[index]);
}
