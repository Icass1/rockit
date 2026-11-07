export interface PagedSearchResult<T> {
    items: T[];
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

export interface PagedSearchState<T> extends PagedSearchResult<T> {
    loading: boolean;
    error: boolean;
    loadMore(): void;
    retry(): void;
}
