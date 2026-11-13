import {
    listOfflineSongRecords,
    loadSessionOffline,
} from "@rockit/platform-browser/offline/db";
import { BROWSER_METADATA_CACHE_PREFIX } from "@rockit/platform-browser/offline/httpCache";
import {
    BaseSongWithAlbumResponseSchema,
    BaseSongWithoutAlbumResponseSchema,
    CollectionPageResponseSchema,
    OFFLINE_METADATA_POLICY,
    QueueResponseSchema,
    type BaseSongWithAlbumResponse,
    type BaseSongWithoutAlbumResponse,
    type TPlayableMedia,
} from "@rockit/shared";

export async function listOfflineLibrarySongs(
    candidates: BaseSongWithAlbumResponse[]
): Promise<TPlayableMedia[]> {
    const records = await listOfflineSongRecords();
    const known = new Map<
        string,
        BaseSongWithAlbumResponse | BaseSongWithoutAlbumResponse
    >(candidates.map((song) => [song.publicId, song]));
    // Older downloads stored audio/name only. Recover their identity from the
    // current account's validated collection snapshots without a network request.
    if (
        records.some(
            (record) => !record.media && !known.has(record.publicId)
        ) &&
        typeof caches !== "undefined"
    ) {
        const session = await loadSessionOffline();
        if (session) {
            const cache = await caches.open(
                BROWSER_METADATA_CACHE_PREFIX +
                    encodeURIComponent(session.username)
            );
            for (const key of await cache.keys()) {
                if (!new URL(key.url).pathname.startsWith("/media/collection/"))
                    continue;
                const response = await cache.match(key);
                if (
                    !response ||
                    Date.now() -
                        Number(response.headers.get("x-rockit-saved-at")) >
                        OFFLINE_METADATA_POLICY.maxAgeMs
                )
                    continue;
                try {
                    const data = await response.json();
                    const queue = QueueResponseSchema.safeParse(data);
                    const page = CollectionPageResponseSchema.safeParse(data);
                    const media = queue.success
                        ? queue.data.queue.map((item) => item.media)
                        : page.success
                          ? page.data.items.map((item) => item.item)
                          : [];
                    for (const song of media)
                        if (song.type === "song")
                            known.set(song.publicId, song);
                } catch {
                    /* A damaged optional snapshot cannot hide other saved songs. */
                }
            }
        }
    }
    return records.flatMap((record) => {
        const parsed = BaseSongWithAlbumResponseSchema.or(
            BaseSongWithoutAlbumResponseSchema
        ).safeParse(record.media ?? known.get(record.publicId));
        return record.audioBlob.size > 0 && parsed.success ? [parsed.data] : [];
    });
}
