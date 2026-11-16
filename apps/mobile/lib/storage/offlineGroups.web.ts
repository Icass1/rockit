import type { OfflineSongRecord } from "@rockit/platform-browser/offline/db";
import { getRockitListName, type Vocabulary } from "@rockit/shared";
import type {
    OfflineStorageGroup,
    OfflineStorageMode,
} from "@/models/interfaces/offlineStorage";

/** Use saved metadata only: browsing downloads must work without the network. */
export function groupOfflineSongs(
    songs: OfflineSongRecord[],
    mode: OfflineStorageMode,
    vocabulary: Vocabulary,
    lang: string
): OfflineStorageGroup[] {
    if (mode === "songs") return [];
    const groups = new Map<string, OfflineStorageGroup>();
    for (const song of songs) {
        const album =
            song.media && "album" in song.media ? song.media.album : undefined;
        const memberships =
            mode === "playlists"
                ? (song.savedCollections ?? [])
                      .filter((item) => item.type === "playlist")
                      .map((item) => ({
                          key: item.publicId,
                          title: getRockitListName(
                              item.publicId,
                              vocabulary,
                              item.name
                          ),
                      }))
                : album
                  ? [{ key: album.publicId, title: album.name }]
                  : (song.savedCollections ?? [])
                        .filter((item) => item.type === "album")
                        .map((item) => ({
                            key: item.publicId,
                            title: item.name,
                        }));
        if (!memberships.length)
            memberships.push({
                key: "ungrouped",
                title:
                    mode === "playlists"
                        ? vocabulary.OFFLINE_STORAGE_OTHER
                        : vocabulary.OFFLINE_STORAGE_UNGROUPED,
            });
        for (const { key, title } of new Map(
            memberships.map((item) => [item.key, item])
        ).values()) {
            const group = groups.get(key) ?? { key, title, songs: [] };
            group.songs.push(song);
            groups.set(key, group);
        }
    }
    for (const group of groups.values()) {
        group.songs.sort((a, b) =>
            mode === "albums"
                ? (a.media?.discNumber ?? 0) - (b.media?.discNumber ?? 0) ||
                  (a.media?.trackNumber ?? 0) - (b.media?.trackNumber ?? 0) ||
                  (a.name ?? a.publicId).localeCompare(
                      b.name ?? b.publicId,
                      lang
                  )
                : a.downloadedAt - b.downloadedAt
        );
    }
    return [...groups.values()].sort((a, b) =>
        a.key === "ungrouped"
            ? 1
            : b.key === "ungrouped"
              ? -1
              : a.title.localeCompare(b.title, lang)
    );
}

export function matchesOfflineSong(
    song: OfflineSongRecord,
    query: string,
    lang: string
): boolean {
    const media = song.media;
    const text = [
        song.name,
        song.publicId,
        media?.name,
        ...(media?.artists.map((artist) => artist.name) ?? []),
        media && "album" in media ? media.album.name : undefined,
    ]
        .filter(Boolean)
        .join(" ");
    return text
        .toLocaleLowerCase(lang)
        .includes(query.trim().toLocaleLowerCase(lang));
}
