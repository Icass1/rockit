"use client";

import { useEffect, useMemo, useReducer } from "react";
import {
    BaseAlbumWithoutSongsResponse,
    BasePlaylistWithoutMediasResponse,
    BaseSongWithAlbumResponse,
    BaseVideoResponse,
    EEvent,
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

function extractItems(data: LibraryMediasResponse): TFilteredLibrary {
    return {
        albums: data.albums.map((a) => a.item),
        playlists: data.playlists.map((p) => p.item),
        songs: data.songs.map((s) => s.item),
        videos: data.videos.map((v) => v.item),
        stations: data.stations.map((s) => s.item),
        shared: data.shared.map((s) => s.item),
    };
}

type SearchableItem = {
    name?: string;
    artists?: Array<{ name: string }>;
    owner?: string | { name?: string };
};

function filterBySearch<T extends SearchableItem>(
    items: T[],
    query: string
): T[] {
    if (!query.trim()) return items;
    const q = query.toLowerCase();
    return items.filter((item): boolean => {
        if ((item.name?.toLowerCase() ?? "").includes(q)) return true;
        if (
            item.artists?.some((a): boolean => a.name.toLowerCase().includes(q))
        )
            return true;
        const ownerStr =
            typeof item.owner === "string"
                ? item.owner
                : (item.owner?.name ?? "");
        if (ownerStr.toLowerCase().includes(q)) return true;
        return false;
    });
}

function sortItems<T extends { name?: string; dateAdded?: string | null }>(
    items: T[],
    mode: EFilterMode
): T[] {
    if (mode === EFilterMode.DEFAULT) return items;
    if (mode === EFilterMode.RECENTLY_ADDED) {
        return [...items].sort((a, b): number => {
            const dateA = a.dateAdded ?? "";
            const dateB = b.dateAdded ?? "";
            return dateB.localeCompare(dateA);
        });
    }
    return [...items].sort((a, b): number => {
        const nameA = a.name?.toLowerCase() ?? "";
        const nameB = b.name?.toLowerCase() ?? "";
        return mode === EFilterMode.ASC
            ? nameA.localeCompare(nameB)
            : nameB.localeCompare(nameA);
    });
}

type Action =
    | { type: "INIT"; data: LibraryMediasResponse }
    | { type: "REMOVE"; publicId: string }
    | {
          type: "ADD";
          media:
              | BaseSongWithAlbumResponse
              | BaseVideoResponse
              | BaseAlbumWithoutSongsResponse
              | BasePlaylistWithoutMediasResponse;
      };

function libraryReducer(
    state: TFilteredLibrary | undefined,
    action: Action
): TFilteredLibrary | undefined {
    switch (action.type) {
        case "INIT":
            return extractItems(action.data);
        case "REMOVE": {
            if (!state) return state;
            const filter = <T extends { publicId: string }>(
                list: T[],
                publicId: string
            ): T[] =>
                list.filter((item): boolean => item.publicId !== publicId);
            return {
                songs: filter(state.songs, action.publicId),
                videos: filter(state.videos, action.publicId),
                albums: filter(state.albums, action.publicId),
                playlists: filter(state.playlists, action.publicId),
                shared: filter(state.shared, action.publicId),
                stations: filter(state.stations, action.publicId),
            };
        }
        case "ADD": {
            if (!state) return state;
            const addToArray = <T extends { publicId: string }>(
                arr: T[],
                item: T
            ): T[] => {
                if (arr.some((el): boolean => el.publicId === item.publicId))
                    return arr;
                return [...arr, item];
            };
            const _state = { ...state };
            switch (action.media.type) {
                case "song":
                    _state.songs = addToArray(_state.songs, action.media);
                    break;
                case "video":
                    _state.videos = addToArray(_state.videos, action.media);
                    break;
                case "album":
                    _state.albums = addToArray(_state.albums, action.media);
                    break;
                case "playlist":
                    _state.playlists = addToArray(
                        _state.playlists,
                        action.media
                    );
                    break;
                default:
                    break;
            }
            return _state;
        }
    }
}

export function useLibraryData({
    filterMode,
    searchQuery,
}: IUseLibraryDataProps): IUseLibraryDataReturn {
    const { data: _libraryData, loading } = useFetch(Http.getUserLibraryMedias);

    const initialData = _libraryData ? extractItems(_libraryData) : undefined;

    const [libraryData, dispatch] = useReducer(libraryReducer, initialData);

    useEffect((): void => {
        if (_libraryData) {
            dispatch({ type: "INIT", data: _libraryData });
        }
    }, [_libraryData]);

    useEffect((): (() => void) => {
        const handler = (e: IMediaRemovedFromLibraryEvent): void => {
            dispatch({ type: "REMOVE", publicId: e.publicId });
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

    useEffect((): (() => void) => {
        const handler = (e: IMediaAddedToLibraryEvent): void => {
            rockIt.mediaManager.getMedia(e.publicId).then((data): void => {
                if (data.isOk()) {
                    dispatch({
                        type: "ADD",
                        media: data.result.media as
                            | BaseSongWithAlbumResponse
                            | BaseVideoResponse
                            | BaseAlbumWithoutSongsResponse
                            | BasePlaylistWithoutMediasResponse,
                    });
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

        const apply = <T extends SearchableItem>(arr: T[]): T[] =>
            sortItems(filterBySearch(arr, searchQuery), filterMode);

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
