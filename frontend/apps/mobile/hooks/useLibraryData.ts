import { useMemo } from "react";
import {
    API_ENDPOINTS,
    filterBySearch,
    LibraryListsResponse,
    LibraryListsResponseSchema,
    sortItems,
    type FilterMode,
} from "@rockit/shared";
import { useApiFetch } from "@/lib/useApiFetch";

export type ContentType =
    | "all"
    | "albums"
    | "playlists"
    | "songs"
    | "videos"
    | "stations"
    | "shared";

interface LibraryItem {
    name: string;
    publicId: string;
    imageUrl: string;
    type: string;
}

interface UseLibraryDataResult {
    albums: LibraryListsResponse["albums"];
    playlists: LibraryListsResponse["playlists"];
    songs: LibraryListsResponse["songs"];
    videos: LibraryListsResponse["videos"];
    stations: LibraryListsResponse["stations"];
    shared: LibraryListsResponse["shared"];
    filtered: LibraryItem[];
    loading: boolean;
    error: string | null;
}

export function useLibraryData(options: {
    filterMode: FilterMode;
    searchQuery: string;
    activeType: ContentType;
}): UseLibraryDataResult {
    const { data, loading, error } = useApiFetch<LibraryListsResponse>(
        API_ENDPOINTS.libraryLists,
        LibraryListsResponseSchema
    );

    const filtered = useMemo(() => {
        if (!data) return [];

        let items: LibraryItem[] = [];

        if (options.activeType === "all") {
            items = [
                ...data.albums.map((a) => ({
                    name: a.name,
                    publicId: a.publicId,
                    imageUrl: a.imageUrl,
                    type: "album",
                })),
                ...data.playlists.map((p) => ({
                    name: p.name,
                    publicId: p.publicId,
                    imageUrl: p.imageUrl,
                    type: "playlist",
                })),
                ...data.songs.map((s) => ({
                    name: s.name,
                    publicId: s.publicId,
                    imageUrl: s.imageUrl,
                    type: "song",
                })),
            ];
        } else if (options.activeType === "albums") {
            items = data.albums.map((a) => ({
                name: a.name,
                publicId: a.publicId,
                imageUrl: a.imageUrl,
                type: "album",
            }));
        } else if (options.activeType === "playlists") {
            items = data.playlists.map((p) => ({
                name: p.name,
                publicId: p.publicId,
                imageUrl: p.imageUrl,
                type: "playlist",
            }));
        } else if (options.activeType === "songs") {
            items = data.songs.map((s) => ({
                name: s.name,
                publicId: s.publicId,
                imageUrl: s.imageUrl,
                type: "song",
            }));
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
