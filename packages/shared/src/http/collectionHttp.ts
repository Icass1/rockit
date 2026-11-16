import { CollectionPageResponseSchema, QueueResponseSchema } from "@/dto";
import { BaseHttp } from "@/http/baseHttp";
import { loadFeaturedCollection } from "@/managers/featuredCollections";
import type { FeaturedCollectionKey } from "@/models/interfaces/featuredCollection";
import { HttpResult } from "@/models/types/httpTypes";

const featured = new Set([
    "liked",
    "recent-mix",
    "most-listened",
    "latest-downloads",
    "year-recap",
    "last-month",
]);

export function isFeaturedCollectionId(id: string): boolean {
    return featured.has(id);
}

/** Virtual featured lists share collection semantics without querying database UUIDs. */
export class CollectionHttp extends BaseHttp {
    static override async getCollectionItems(
        publicId: string,
        offset = 0,
        limit = 100,
        query = ""
    ): ReturnType<typeof BaseHttp.getCollectionItems> {
        if (!featured.has(publicId))
            return super.getCollectionItems(publicId, offset, limit, query);
        try {
            const collection = await loadFeaturedCollection(
                this,
                publicId as FeaturedCollectionKey
            );
            const entries = collection.medias.filter(
                ({ item }) =>
                    !query ||
                    item.name.toLowerCase().includes(query.toLowerCase())
            );
            return new HttpResult({
                ok: true,
                code: 200,
                message: "OK",
                result: CollectionPageResponseSchema.parse({
                    collection,
                    items: entries.slice(offset, offset + limit),
                    offset,
                    limit,
                    total: entries.length,
                    hasMore: offset + limit < entries.length,
                }),
            });
        } catch (error) {
            return new HttpResult<import("@/dto").CollectionPageResponse>({
                ok: false,
                code: 500,
                message:
                    error instanceof Error
                        ? error.message
                        : "Featured collection unavailable",
                detail: "",
            });
        }
    }
    static override async resolveCollectionQueue(
        publicId: string
    ): ReturnType<typeof BaseHttp.resolveCollectionQueue> {
        if (!featured.has(publicId))
            return super.resolveCollectionQueue(publicId);
        const page = await this.getCollectionItems(
            publicId,
            0,
            Number.MAX_SAFE_INTEGER
        );
        if (!page.isOk())
            return new HttpResult<import("@/dto").QueueResponse>({
                ok: false,
                code: page.code,
                message: page.message,
                detail: page.detail ?? "",
            });
        const items = page.result.items.filter(({ item }) =>
            ["song", "video", "station"].includes(item.type)
        );
        return new HttpResult({
            ok: true,
            code: 200,
            message: "OK",
            result: QueueResponseSchema.parse({
                queue: items.map(({ item }, index) => ({
                    media: item,
                    queueMediaId: index,
                    listPublicId: publicId,
                    sortedIndex: index,
                    randomIndex: index,
                })),
                currentQueueMediaId: items.length ? 0 : null,
                offset: 0,
                total: items.length,
                queueType: "SORTED",
            }),
        });
    }
}
