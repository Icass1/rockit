import type { BaseHttp } from "@/http/baseHttp";
import type { OfflineCollectionOptions } from "@/models/interfaces/offlineCollection";

/** Traverse paged and nested collections without concurrent media transfers. */
export async function downloadCollectionOffline(
    http: typeof BaseHttp,
    publicId: string,
    options: OfflineCollectionOptions
): Promise<number> {
    const pending = [publicId];
    const collections = new Set<string>();
    const songs = new Set<string>();
    let saved = 0;
    const assertCurrent = () => {
        if (!options.isCurrent()) throw new Error("Obsolete offline request");
    };
    while (pending.length) {
        const id = pending.shift()!;
        if (collections.has(id)) continue;
        collections.add(id);
        let offset = 0;
        while (true) {
            assertCurrent();
            const response = await http.getCollectionItems(id, offset, 100);
            assertCurrent();
            if (!response.isOk()) throw new Error(response.message);
            const page = response.result;
            for (const { item } of page.items) {
                assertCurrent();
                if (item.type === "album" || item.type === "playlist")
                    pending.push(item.publicId);
                else if (
                    item.type === "song" &&
                    item.audioUrl &&
                    !songs.has(item.publicId)
                ) {
                    songs.add(item.publicId);
                    await options.save(item);
                    assertCurrent();
                    saved++;
                }
            }
            if (!page.hasMore) break;
            const next = page.offset + page.limit;
            if (!Number.isFinite(next) || next <= offset || !page.items.length)
                throw new Error("Invalid offline pagination");
            offset = next;
        }
    }
    return saved;
}
