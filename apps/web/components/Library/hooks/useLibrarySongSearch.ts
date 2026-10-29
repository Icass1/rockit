"use client";

import { useEffect, useMemo, useState } from "react";
import { useStore } from "@nanostores/react";
import { EEvent } from "@rockit/shared";
import { EFilterMode } from "@/models/enums/filterMode";
import type {
    LibrarySongSearchSnapshot,
    LibrarySongSearchState,
} from "@/models/interfaces/librarySongSearch";
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
    const request = useMemo(
        () => ({
            query: normalized,
            sortMode,
            username,
            loggedIn,
            enabled,
            revision,
        }),
        [normalized, sortMode, username, loggedIn, enabled, revision]
    );
    const [page, setPage] = useState<{
        request: typeof request;
        offset: number;
    }>();
    const [attempt, setAttempt] = useState(0);
    const offset = page?.request === request ? page.offset : 0;
    const batch = useMemo(
        () => ({ request, offset, attempt }),
        [request, offset, attempt]
    );
    const [snapshot, setSnapshot] = useState<{
        request: typeof request;
        value: LibrarySongSearchSnapshot;
    }>();
    const [completed, setCompleted] = useState<{
        batch: typeof batch;
        error: boolean;
    }>();
    const active = enabled && loggedIn && !!username && !!normalized;
    const value =
        active && snapshot?.request === request ? snapshot.value : undefined;
    const loading = active && completed?.batch !== batch;
    const error = active && completed?.batch === batch && completed.error;

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

    useEffect(() => {
        if (!active) return;
        let cancelled = false;
        const timer = setTimeout(
            () => {
                const sort =
                    request.sortMode === EFilterMode.ASC
                        ? "name_asc"
                        : request.sortMode === EFilterMode.DESC
                          ? "name_desc"
                          : request.sortMode === EFilterMode.RECENTLY_ADDED
                            ? "recent"
                            : "relevance";
                void Http.searchLibrarySongsAsync(
                    request.query,
                    offset,
                    50,
                    sort
                )
                    .then((response) => {
                        if (cancelled) return;
                        if (!response.isOk()) {
                            setCompleted({ batch, error: true });
                            return;
                        }
                        const result = response.result;
                        setSnapshot((previous) => {
                            const prior =
                                offset && previous?.request === request
                                    ? previous.value.songs
                                    : [];
                            const songs = Array.from(
                                new Map(
                                    [...prior, ...result.songs].map((song) => [
                                        song.publicId,
                                        song,
                                    ])
                                ).values()
                            );
                            return {
                                request,
                                value: {
                                    songs,
                                    total: result.total,
                                    hasMore: result.hasMore,
                                    nextOffset: result.offset + result.limit,
                                },
                            };
                        });
                        setCompleted({ batch, error: false });
                    })
                    .catch(() => {
                        if (!cancelled) setCompleted({ batch, error: true });
                    });
            },
            offset ? 0 : 300
        );
        return (): void => {
            cancelled = true;
            clearTimeout(timer);
        };
    }, [request, batch, offset, active]);

    return {
        songs: value?.songs ?? [],
        total: value?.total ?? 0,
        hasMore: value?.hasMore ?? false,
        nextOffset: value?.nextOffset ?? 0,
        loading,
        error,
        loadMore: () => {
            if (value?.hasMore && !loading && !error)
                setPage({ request, offset: value.nextOffset });
        },
        retry: () => setAttempt((current) => current + 1),
    };
}
