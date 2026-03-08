"use client";

import { useMemo } from "react";
import useFetch from "@/hooks/useFetch";
import { LibraryListsResponse, LibraryListsResponseSchema } from "@/dto";

export type ContentType =
    | "all"
    | "albums"
    | "playlists"
    | "songs"
    | "videos"
    | "stations";
export type FilterMode = "default" | "asc" | "desc";

interface UseLibraryDataProps {
    filterMode: FilterMode;
    searchQuery: string;
}

type FilteredLibrary = {
    albums: LibraryListsResponse["albums"];
    playlists: LibraryListsResponse["playlists"];
    songs: LibraryListsResponse["songs"];
    videos: LibraryListsResponse["videos"];
    stations: LibraryListsResponse["stations"];
};

interface UseLibraryDataReturn extends FilteredLibrary {
    loading: boolean;
    filtered: FilteredLibrary;
}

const EMPTY: FilteredLibrary = {
    albums: [],
    playlists: [],
    songs: [],
    videos: [],
    stations: [],
};

function filterBySearch<T extends { name?: string }>(
    items: T[],
    query: string
): T[] {
    if (!query.trim()) return items;
    const q = query.toLowerCase();
    return items.filter((item) => (item.name?.toLowerCase() ?? "").includes(q));
}

function sortItems<T extends { name?: string }>(
    items: T[],
    mode: FilterMode
): T[] {
    if (mode === "default") return items;
    return [...items].sort((a, b) => {
        const nameA = a.name?.toLowerCase() ?? "";
        const nameB = b.name?.toLowerCase() ?? "";
        return mode === "asc"
            ? nameA.localeCompare(nameB)
            : nameB.localeCompare(nameA);
    });
}

export function useLibraryData({
    filterMode,
    searchQuery,
}: UseLibraryDataProps): UseLibraryDataReturn {
    // useFetch returns [data, refetch] — data is undefined until resolved
    const [data] = useFetch("/user/library/lists", LibraryListsResponseSchema);

    const loading = data === undefined;

    const filtered = useMemo<FilteredLibrary>(() => {
        if (!data) return EMPTY;

        const apply = <T extends { name?: string }>(arr: T[]) =>
            sortItems(filterBySearch(arr, searchQuery), filterMode);

        return {
            albums: apply(data.albums),
            playlists: apply(data.playlists),
            songs: apply(data.songs),
            videos: apply(data.videos),
            stations: apply(data.stations),
        };
    }, [data, searchQuery, filterMode]);

    return {
        ...(data ?? EMPTY),
        loading,
        filtered,
    };
}
