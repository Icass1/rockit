"use client";

import { useEffect, useState } from "react";
import { useStore } from "@nanostores/react";
import { EEvent } from "@rockit/shared";
import { usePagedSearch } from "@rockit/ui/headless/usePagedSearch";
import { EFilterMode } from "@/models/enums/filterMode";
import type { LibrarySongSearchState } from "@/models/interfaces/librarySongSearch";
import { Http } from "@/lib/http";
import { rockIt } from "@/lib/rockit/rockIt";

/** One debounced, bounded request; stale queries/accounts never publish their results. */
export function useLibrarySongSearch(
    query: string,
    sortMode: EFilterMode,
    enabled: boolean
): LibrarySongSearchState {
    const username = useStore(rockIt.userManager.usernameAtom);
    const loggedIn = useStore(rockIt.userManager.loggedInAtom);
    const [revision, setRevision] = useState(0);
    const normalized = query.trim();
    useEffect(() => {
        const refresh = (): void => setRevision((value) => value + 1);
        const events = [
            EEvent.MediaAddedToLibrary,
            EEvent.MediaRemovedFromLibrary,
            EEvent.MediaAddedToPlaylist,
            EEvent.MediaRemovedFromPlaylist,
        ];
        for (const event of events)
            rockIt.eventManager.addEventListener(event, refresh);
        window.addEventListener("online", refresh);
        return (): void => {
            for (const event of events)
                rockIt.eventManager.removeEventListener(event, refresh);
            window.removeEventListener("online", refresh);
        };
    }, []);

    const result = usePagedSearch(
        {
            query: normalized,
            scope: username ?? "",
            sort:
                sortMode === EFilterMode.ASC
                    ? "name_asc"
                    : sortMode === EFilterMode.DESC
                      ? "name_desc"
                      : sortMode === EFilterMode.RECENTLY_ADDED
                        ? "recent"
                        : "relevance",
            revision,
            enabled: enabled && loggedIn,
        },
        fetchSongs
    );
    return { ...result, songs: result.items };
}

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
