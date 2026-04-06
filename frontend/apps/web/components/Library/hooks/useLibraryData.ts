"use client";

import { useMemo } from "react";
import { LibraryListsResponseSchema } from "@/dto";
import { EFilterMode } from "@/models/enums/filterMode";
import {
    IUseLibraryDataProps,
    IUseLibraryDataReturn,
    TFilteredLibrary,
} from "@/models/interfaces/useLibraryData";
import useFetch from "@/hooks/useFetch";

const EMPTY: TFilteredLibrary = {
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
    mode: EFilterMode
): T[] {
    if (mode === EFilterMode.DEFAULT) return items;
    return [...items].sort((a, b) => {
        const nameA = a.name?.toLowerCase() ?? "";
        const nameB = b.name?.toLowerCase() ?? "";
        return mode === EFilterMode.ASC
            ? nameA.localeCompare(nameB)
            : nameB.localeCompare(nameA);
    });
}

export function useLibraryData({
    filterMode,
    searchQuery,
}: IUseLibraryDataProps): IUseLibraryDataReturn {
    const { data: libraryData, loading } = useFetch(
        "/user/library/lists",
        LibraryListsResponseSchema
    );

    const filtered = useMemo((): TFilteredLibrary => {
        if (!libraryData) return EMPTY;

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
            albums: apply(libraryData.albums),
            playlists: apply(libraryData.playlists),
            songs: apply(libraryData.songs),
            videos: apply(libraryData.videos),
            stations: apply(libraryData.stations),
            shared: apply(libraryData.shared),
        };
    }, [libraryData, searchQuery, filterMode]);

    const result: IUseLibraryDataReturn = {
        ...filtered,
        loading,
        filtered,
    };

    return result;
}
