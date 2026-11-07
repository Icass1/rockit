import { useStore } from "@nanostores/react";
import { usePagedSearch } from "@rockit/ui/headless/usePagedSearch";
import { Http } from "@/lib/http";
import { userManager } from "@/lib/managers/userManager";

async function fetchSongs(query: string, offset: number, sort: string) {
    const response = await Http.searchLibrarySongsAsync(
        query,
        offset,
        50,
        sort
    );
    if (!response.isOk()) throw new Error(response.message);
    const page = response.result;
    return {
        items: page.songs,
        total: page.total,
        hasMore: page.hasMore,
        nextOffset: page.offset + page.limit,
    };
}

export function useLibrarySongSearch(
    query: string,
    enabled: boolean,
    sort: string
) {
    const session = useStore(userManager.sessionAtom);
    return usePagedSearch(
        { query, scope: session?.username ?? "", enabled, sort },
        fetchSongs
    );
}
