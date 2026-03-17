"use client";

import { useMemo } from "react";
import {
    LibraryListsResponse,
    LibraryListsResponseSchema,
} from "@/packages/dto";
import useFetch from "@/hooks/useFetch";

export type ContentType =
    | "all"
    | "albums"
    | "playlists"
    | "songs"
    | "videos"
    | "stations"
    | "shared";
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
    shared: LibraryListsResponse["shared"];
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
    shared: [],
};

function filterBySearch<
    T extends {
        name?: string;
        artists?: Array<{ name: string }>;
        owner?: string;
    },
>(items: T[], query: string): T[] {
    if (!query.trim()) return items;
    const q = query.toLowerCase();
    return items.filter((item) => {
        if ((item.name?.toLowerCase() ?? "").includes(q)) return true;
        if (item.artists?.some((a) => a.name.toLowerCase().includes(q)))
            return true;
        if ((item.owner?.toLowerCase() ?? "").includes(q)) return true;
        return false;
    });
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

        const apply = <
            T extends {
                name?: string;
                artists?: Array<{ name: string }>;
                owner?: string;
            },
        >(
            arr: T[]
        ) => sortItems(filterBySearch(arr, searchQuery), filterMode);

        return {
            albums: apply(data.albums),
            playlists: apply(data.playlists),
            songs: apply(data.songs),
            videos: apply(data.videos),
            stations: apply(data.stations),
            shared: apply(data.shared),
        };
    }, [data, searchQuery, filterMode]);

    return {
        ...(data ?? EMPTY),
        loading,
        filtered,
    };
}
