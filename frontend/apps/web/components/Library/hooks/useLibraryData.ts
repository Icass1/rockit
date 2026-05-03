"use client";

import { useEffect, useMemo, useState } from "react";
import { LibraryListsResponseSchema } from "@/dto";
import { EEvent, IMediaRemovedFromLibraryEvent } from "@rockit/shared";
import { EFilterMode } from "@/models/enums/filterMode";
import {
    IUseLibraryDataProps,
    IUseLibraryDataReturn,
    TFilteredLibrary,
} from "@/models/interfaces/useLibraryData";
import useFetch from "@/hooks/useFetch";
import { rockIt } from "@/lib/rockit/rockIt";

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
    const { data: _libraryData, loading } = useFetch(
        "/user/library/medias",
        LibraryListsResponseSchema
    );

    const [libraryData, setLibraryData] = useState(_libraryData);

    useEffect(() => {
        setLibraryData(_libraryData);
    }, [_libraryData]);

    useEffect(() => {
        const filter = <T extends { publicId: string }>(
            list: T[],
            publicId: string
        ) => list.filter((item) => item.publicId != publicId);

        const handler = (e: IMediaRemovedFromLibraryEvent) => {
            console.log("AAAAAAAAAAAAAA", e);
            setLibraryData((data) => {
                if (!data) return data;

                return {
                    songs: filter(data.songs, e.publicId),
                    videos: filter(data.videos, e.publicId),
                    albums: filter(data.albums, e.publicId),
                    playlists: filter(data.playlists, e.publicId),
                    shared: filter(data.shared, e.publicId),
                    stations: filter(data.stations, e.publicId),
                };
            });
        };

        rockIt.eventManager.addEventListener(
            EEvent.MediaRemovedFromLibrary,
            handler
        );
        return () =>
            rockIt.eventManager.removeEventListener(
                EEvent.MediaRemovedFromLibrary,
                handler
            );
    }, []);

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
