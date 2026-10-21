import { useMemo } from "react";
import {
    BaseAlbumWithoutSongsResponse,
    BasePlaylistWithoutMediasResponse,
    BaseSongWithAlbumResponse,
    BaseStationResponse,
    BaseVideoResponse,
    filterBySearch,
    sortItems,
    TMedia,
    type FilterMode,
} from "@rockit/shared";
import { ELibraryActiveType } from "@/models/enums/libraryActiveType";
import { getLibraryMedias } from "@/lib/http/http";
import useFetch from "@/lib/useFetch";

interface UseLibraryDataResult {
    albums: BaseAlbumWithoutSongsResponse[];
    playlists: BasePlaylistWithoutMediasResponse[];
    songs: BaseSongWithAlbumResponse[];
    videos: BaseVideoResponse[];
    stations: BaseStationResponse[];
    shared: BasePlaylistWithoutMediasResponse[];
    filtered: TMedia[];
    loading: boolean;
    error: string | undefined;
}

export function useLibraryData(options: {
    filterMode: FilterMode;
    searchQuery: string;
    activeType: ELibraryActiveType;
}): UseLibraryDataResult {
    // const { data, loading, error } = useApiFetch<LibraryMediasResponse>(
    //     API_ENDPOINTS.libraryMedias,
    //     LibraryMediasResponseSchema
    // );

    const { data, loading, error } = useFetch(getLibraryMedias);

    const filtered = useMemo(() => {
        if (!data) return [];

        const albums = data.albums.map((a) => a.item);
        const playlists = data.playlists.map((p) => p.item);
        const songs = data.songs.map((s) => s.item);
        const videos = data.videos.map((v) => v.item);

        let items: TMedia[] = [];

        if (options.activeType === ELibraryActiveType.All) {
            items = [...albums, ...playlists, ...songs, ...videos];
        } else if (options.activeType === ELibraryActiveType.Albums) {
            items = albums;
        } else if (options.activeType === ELibraryActiveType.Playlists) {
            items = playlists;
        } else if (options.activeType === ELibraryActiveType.Songs) {
            items = songs;
        } else if (options.activeType === ELibraryActiveType.Videos) {
            items = videos;
        }

        const searched = filterBySearch(items, options.searchQuery);
        return sortItems(searched, options.filterMode);
    }, [data, options.activeType, options.searchQuery, options.filterMode]);

    return {
        albums: data?.albums.map((a) => a.item) ?? [],
        playlists: data?.playlists.map((p) => p.item) ?? [],
        songs: data?.songs.map((s) => s.item) ?? [],
        videos: data?.videos.map((v) => v.item) ?? [],
        stations: data?.stations.map((s) => s.item) ?? [],
        shared: data?.shared.map((s) => s.item) ?? [],
        filtered,
        loading,
        error,
    };
}
