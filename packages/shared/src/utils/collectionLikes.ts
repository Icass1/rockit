import type { BaseHttp } from "@/http/baseHttp";
import { loadFeaturedCollection } from "@/managers/featuredCollections";
import type { FeaturedCollectionKey } from "@/models/interfaces/featuredCollection";

/** Read every page and nested collection once, preserving unique song identities. */
export async function getCollectionSongIds(
    http: typeof BaseHttp,
    publicId: string
): Promise<string[]> {
    const id = publicId.startsWith("featured:")
        ? (
              await loadFeaturedCollection(
                  http,
                  publicId.slice(9) as FeaturedCollectionKey
              )
          ).publicId
        : publicId;
    const pending = [id],
        visited = new Set<string>(),
        songs = new Set<string>();
    while (pending.length) {
        const current = pending.shift()!;
        if (visited.has(current)) continue;
        visited.add(current);
        let offset = 0;
        while (true) {
            const response = await http.getCollectionItems(
                current,
                offset,
                100
            );
            if (!response.isOk()) throw new Error(response.message);
            const page = response.result;
            for (const { item } of page.items) {
                if (item.type === "song") songs.add(item.publicId);
                else if (item.type === "album" || item.type === "playlist")
                    pending.push(item.publicId);
            }
            if (!page.hasMore) break;
            const next = page.offset + page.limit;
            if (!page.items.length || !Number.isFinite(next) || next <= offset)
                throw new Error("Invalid collection pagination");
            offset = next;
        }
    }
    return [...songs];
}

/** Add only missing favorites; remove existing ones through the DELETE endpoint. */
export async function setCollectionSongsLiked(
    http: typeof BaseHttp,
    songs: string[],
    liked: boolean,
    isCurrent: () => boolean
): Promise<void> {
    const response = await http.getLikedMedia();
    if (!response.isOk()) throw new Error(response.message);
    const existing = new Set(response.result.media);
    const changed = songs.filter((id) => existing.has(id) !== liked);
    for (let offset = 0; offset < changed.length; offset += liked ? 100 : 4) {
        if (!isCurrent()) throw new Error("Obsolete collection action");
        const batch = changed.slice(offset, offset + (liked ? 100 : 4));
        const results = liked
            ? [await http.likeMediaAsync({ publicIds: batch })]
            : await Promise.all(batch.map((id) => http.unlikeMedia(id)));
        const failed = results.find((result) => !result.isOk());
        if (failed) throw new Error(failed.message);
    }
}
