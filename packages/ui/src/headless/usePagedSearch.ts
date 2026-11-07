"use client";

import { useEffect, useMemo, useState } from "react";
import type {
    PagedSearchRequest,
    PagedSearchResult,
    PagedSearchState,
} from "@rockit/shared";

/** One bounded page at a time; obsolete queries and accounts cannot publish. */
export function usePagedSearch<T extends { publicId: string }>(
    input: PagedSearchRequest,
    fetchPage: (
        query: string,
        offset: number,
        sort: string
    ) => Promise<PagedSearchResult<T>>
): PagedSearchState<T> {
    const { scope, sort, revision, enabled } = input;
    const query = input.query.trim();
    const request = useMemo(
        () => ({ query, scope, sort, revision, enabled }),
        [query, scope, sort, revision, enabled]
    );
    const [page, setPage] = useState<{
        request: typeof request;
        offset: number;
    }>();
    const [attempt, setAttempt] = useState(0);
    const offset = page?.request === request ? page.offset : 0;
    const batch = useMemo(
        () => ({ request, offset, attempt, fetchPage }),
        [request, offset, attempt, fetchPage]
    );
    const [snapshot, setSnapshot] = useState<{
        request: typeof request;
        value: PagedSearchResult<T>;
    }>();
    const [completed, setCompleted] = useState<{
        batch: typeof batch;
        error: boolean;
    }>();
    const active = enabled && !!scope && !!query;
    const value =
        active && snapshot?.request === request ? snapshot.value : undefined;
    const loading = active && completed?.batch !== batch;
    const error = active && completed?.batch === batch && completed.error;

    useEffect(() => {
        if (!active) return;
        let cancelled = false;
        const timer = setTimeout(
            () => {
                void fetchPage(request.query, offset, request.sort)
                    .then((result) => {
                        if (cancelled) return;
                        setSnapshot((previous) => ({
                            request,
                            value: {
                                ...result,
                                items: Array.from(
                                    new Map(
                                        [
                                            ...(offset &&
                                            previous?.request === request
                                                ? previous.value.items
                                                : []),
                                            ...result.items,
                                        ].map((item) => [item.publicId, item])
                                    ).values()
                                ),
                                // A broken upstream page must not create an endless request loop.
                                hasMore:
                                    result.hasMore &&
                                    result.nextOffset > offset &&
                                    result.items.length > 0,
                            },
                        }));
                        setCompleted({ batch, error: false });
                    })
                    .catch(() => {
                        if (!cancelled) setCompleted({ batch, error: true });
                    });
            },
            offset ? 0 : 300
        );
        return () => {
            cancelled = true;
            clearTimeout(timer);
        };
    }, [request, batch, active, offset, fetchPage]);

    return {
        items: value?.items ?? [],
        total: value?.total ?? 0,
        nextOffset: value?.nextOffset ?? 0,
        hasMore: value?.hasMore ?? false,
        loading,
        error,
        loadMore: () => {
            if (value?.hasMore && !loading && !error)
                setPage({ request, offset: value.nextOffset });
        },
        retry: () => setAttempt((current) => current + 1),
    };
}
