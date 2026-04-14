import { useMemo } from "react";
import {
    API_ENDPOINTS,
    filterBySearch,
    LibraryListsResponse,
    LibraryListsResponseSchema,
    sortItems,
    TMedia,
    type FilterMode,
} from "@rockit/shared";
import { ELibraryActiveType } from "@/models/enums/libraryActiveType";
import { useApiFetch } from "@/lib/useApiFetch";

interface UseLibraryDataResult {
    albums: LibraryListsResponse["albums"];
    playlists: LibraryListsResponse["playlists"];
    songs: LibraryListsResponse["songs"];
    videos: LibraryListsResponse["videos"];
    stations: LibraryListsResponse["stations"];
    shared: LibraryListsResponse["shared"];
    filtered: TMedia[];
    loading: boolean;
    error: string | null;
}

export function useLibraryData(options: {
    filterMode: FilterMode;
    searchQuery: string;
    activeType: ELibraryActiveType;
}): UseLibraryDataResult {
    const { data, loading, error } = useApiFetch<LibraryListsResponse>(
        API_ENDPOINTS.libraryLists,
        LibraryListsResponseSchema
    );

    const filtered = useMemo(() => {
        if (!data) return [];

        let items: TMedia[] = [];

        if (options.activeType === ELibraryActiveType.All) {
            items = [
                ...data.albums,
                ...data.playlists,
                ...data.songs,
                ...data.videos,
            ];
        } else if (options.activeType === ELibraryActiveType.Albums) {
            items = data.albums;
        } else if (options.activeType === ELibraryActiveType.Playlists) {
            items = data.playlists;
        } else if (options.activeType === ELibraryActiveType.Songs) {
            items = data.songs;
        } else if (options.activeType === ELibraryActiveType.Videos) {
            items = data.videos;
        }

        const searched = filterBySearch(items, options.searchQuery);
        return sortItems(searched, options.filterMode);
    }, [data, options.activeType, options.searchQuery, options.filterMode]);

    return {
        albums: data?.albums ?? [],
        playlists: data?.playlists ?? [],
        songs: data?.songs ?? [],
        videos: data?.videos ?? [],
        stations: data?.stations ?? [],
        shared: data?.shared ?? [],
        filtered,
        loading,
        error,
    };
}
