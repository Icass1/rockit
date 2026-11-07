import type { BasePlaylistWithMediasResponse } from "@/dto";
import type { BaseHttp } from "@/http/baseHttp";
import type { CollectionPageState } from "@/models/interfaces/collectionPageState";
import type { FeaturedCollectionKey } from "@/models/interfaces/featuredCollection";
import type { Vocabulary } from "@/models/types/vocabulary";

export async function loadFeaturedCollection(
    http: typeof BaseHttp,
    key: FeaturedCollectionKey
): Promise<BasePlaylistWithMediasResponse> {
    const loaders = {
        "last-month": () => http.getFeaturedLastMonth(),
        liked: () => http.getFeaturedLiked(),
        "most-listened": () => http.getFeaturedMostListened(),
        "recent-mix": () => http.getFeaturedRecentMix(),
        "year-recap": () => http.getFeaturedYearRecap(),
    };
    const response = await loaders[key]();
    if (!response.isOk()) throw new Error(response.message);
    return response.result;
}

export function featuredCollectionSeed(
    playlist: BasePlaylistWithMediasResponse
): Partial<CollectionPageState> {
    return {
        collection: playlist,
        media: playlist.medias.map((entry) => entry.item),
        expandedByMediaId: Object.fromEntries(
            playlist.medias.map((entry) => [
                entry.item.publicId,
                entry.expanded,
            ])
        ),
        offset: playlist.offset,
        limit: playlist.limit,
        total: playlist.total,
        hasMore: playlist.hasMore,
    };
}

export function getRockitListName(
    key: string,
    vocabulary: Vocabulary,
    fallback = key
): string {
    const names: Record<FeaturedCollectionKey, string> = {
        liked: vocabulary.LIKED_SONGS,
        "most-listened": vocabulary.MOST_LISTENED,
        "recent-mix": vocabulary.RECENT_MIX,
        "last-month": vocabulary.NAV_LAST_MONTH,
        "year-recap": vocabulary.NAV_YEAR_RECAP,
    };
    return Object.prototype.hasOwnProperty.call(names, key)
        ? names[key as FeaturedCollectionKey]
        : fallback;
}
