import type { BaseSearchResultsItem } from "@/dto";

/** A suggestion the backend flagged as already downloaded in this Rockit
 *  instance (matched locally by name/artist). Playable right away. */
export function isDiscoverItemInLibrary(item: BaseSearchResultsItem): boolean {
    return Boolean(item.downloaded && item.publicId);
}

/** Stable identity for a discovery suggestion. Resolved search results carry
 *  a providerUrl; in-library ones a publicId; bare Last.fm suggestions carry
 *  neither, so fall back to artist-title. Never return "" — React keys (and
 *  the shared in-flight download key set) must stay unique. */
export function getDiscoverKey(item: BaseSearchResultsItem): string {
    if (item.publicId) return item.publicId;
    if (item.providerUrl) return item.providerUrl;
    return `${item.artists[0]?.name ?? "?"}-${item.name}`;
}
