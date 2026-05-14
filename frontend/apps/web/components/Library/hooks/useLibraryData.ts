"use client";

import { useEffect, useMemo, useState } from "react";
import {
    EEvent,
    EMediaType,
    IMediaAddedToLibraryEvent,
    IMediaRemovedFromLibraryEvent,
    LibraryMediasResponse,
} from "@rockit/shared";
import { EFilterMode } from "@/models/enums/filterMode";
import {
    IUseLibraryDataProps,
    IUseLibraryDataReturn,
    TFilteredLibrary,
} from "@/models/interfaces/useLibraryData";
import useFetch from "@/hooks/useFetch";
import { Http } from "@/lib/http";
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
    return items.filter((item): boolean => {
        if ((item.name?.toLowerCase() ?? "").includes(q)) return true;
        if (
            item.artists?.some((a): boolean => a.name.toLowerCase().includes(q))
        )
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
    return [...items].sort((a, b): number => {
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
    const { data: _libraryData, loading } = useFetch(Http.getUserLibraryMedias);

    const [libraryData, setLibraryData] = useState<
        LibraryMediasResponse | undefined
    >(_libraryData);

    useEffect((): void => {
        setLibraryData(_libraryData);
    }, [_libraryData]);

    useEffect((): (() => void) => {
        const filter = <T extends { publicId: string }>(
            list: T[],
            publicId: string
        ): T[] => list.filter((item): boolean => item.publicId !== publicId);

        const handler = (e: IMediaRemovedFromLibraryEvent): void => {
            setLibraryData((data): LibraryMediasResponse | undefined => {
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
        return (): void =>
            rockIt.eventManager.removeEventListener(
                EEvent.MediaRemovedFromLibrary,
                handler
            );
    }, []);

    function addMediaToArray<T extends { publicId: string }>(
        arr: T[],
        item: T
    ): T[] {
        if (arr.some((el): boolean => el.publicId === item.publicId))
            return arr;
        return [...arr, item];
    }

    useEffect((): (() => void) => {
        const handler = (e: IMediaAddedToLibraryEvent): void => {
            rockIt.mediaManager.getMedia(e.publicId).then((data): void => {
                if (data.isOk()) {
                    setLibraryData(
                        (libraryData): LibraryMediasResponse | undefined => {
                            if (!libraryData) return;

                            const _libraryData = { ...libraryData };
                            const media = data.result.media;

                            switch (media.type) {
                                case EMediaType.Song:
                                    _libraryData.songs = addMediaToArray(
                                        _libraryData.songs,
                                        media
                                    );
                                    break;
                                case EMediaType.Video:
                                    _libraryData.videos = addMediaToArray(
                                        _libraryData.videos,
                                        media
                                    );
                                    break;
                                case EMediaType.Album:
                                    _libraryData.albums = addMediaToArray(
                                        _libraryData.albums,
                                        media
                                    );
                                    break;
                                case EMediaType.Playlist:
                                    _libraryData.playlists = addMediaToArray(
                                        _libraryData.playlists,
                                        media
                                    );
                                    break;
                                default:
                                    break;
                            }

                            return _libraryData;
                        }
                    );
                } else {
                    rockIt.notificationManager.notifyError(
                        rockIt.vocabularyManager.vocabulary.ERROR_GETTING_MEDIA
                    );
                }
            });
        };

        rockIt.eventManager.addEventListener(
            EEvent.MediaAddedToLibrary,
            handler
        );
        return (): void =>
            rockIt.eventManager.removeEventListener(
                EEvent.MediaAddedToLibrary,
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
        ): T[] => sortItems(filterBySearch(arr, searchQuery), filterMode);

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
