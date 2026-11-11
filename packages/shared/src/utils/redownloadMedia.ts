import type { BaseHttp } from "@/http/baseHttp";
import type { TMedia } from "@/models/types/media";

/** Resolve the whole album before queuing replacements; keep existing files available. */
export async function redownloadMedia(
    http: typeof BaseHttp,
    media: TMedia,
    isCurrent: () => boolean
): Promise<number> {
    const ids = new Set<string>();
    if (media.type === "album") {
        let offset = 0;
        while (true) {
            if (!isCurrent()) throw new Error("Obsolete session");
            const response = await http.getCollectionItems(
                media.publicId,
                offset,
                100
            );
            if (!response.isOk()) throw new Error(response.message);
            const page = response.result;
            for (const { item } of page.items)
                if (item.type === "song") ids.add(item.publicId);
            if (!page.hasMore) break;
            const next = page.offset + page.limit;
            if (
                !Number.isFinite(next) ||
                next <= offset ||
                page.items.length === 0
            )
                throw new Error("Invalid collection pagination");
            offset = next;
        }
    } else if (media.type === "song" || media.type === "video")
        ids.add(media.publicId);
    else throw new Error("Unsupported media type");
    if (!ids.size) throw new Error("Empty collection");
    for (const publicId of ids) {
        if (!isCurrent()) throw new Error("Obsolete session");
        const started = await http.startDownload({
            ids: [publicId],
            title: media.name,
            replaceExisting: true,
        });
        if (!started.isOk()) throw new Error(started.message);
    }
    return ids.size;
}
