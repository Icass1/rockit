export interface PagedSearchResult<T, Metadata = undefined> {
    items: T[];
    metadata?: Metadata;
    total: number;
    nextOffset: number;
    hasMore: boolean;
}

export interface PagedSearchRequest {
    query: string;
    scope: string;
    sort: string;
    revision?: number;
    enabled: boolean;
}

export interface PagedSearchState<
    T,
    Metadata = undefined,
> extends PagedSearchResult<T, Metadata> {
    loading: boolean;
    error: boolean;
    loadMore(): void;
    retry(): void;
}
