import type { BaseSongWithAlbumResponse } from "@rockit/shared";

export interface LibrarySongSearchSnapshot {
    songs: BaseSongWithAlbumResponse[];
    total: number;
    hasMore: boolean;
    nextOffset: number;
}

export interface LibrarySongSearchState extends LibrarySongSearchSnapshot {
    loading: boolean;
    error: boolean;
    loadMore: () => void;
    retry: () => void;
}
