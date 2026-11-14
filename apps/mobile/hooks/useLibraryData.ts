import { useMemo } from "react";
import {
    BaseAlbumWithoutSongsResponse,
    BasePlaylistWithoutMediasResponse,
    BaseSongWithAlbumResponse,
    BaseStationResponse,
    BaseVideoResponse,
} from "@rockit/shared";
import { getLibraryMedias } from "@/lib/http/http";
import useFetch from "@/lib/useFetch";

interface UseLibraryDataResult {
    albums: BaseAlbumWithoutSongsResponse[];
    playlists: BasePlaylistWithoutMediasResponse[];
    songs: BaseSongWithAlbumResponse[];
    videos: BaseVideoResponse[];
    stations: BaseStationResponse[];
    shared: BasePlaylistWithoutMediasResponse[];
    addedAtById: ReadonlyMap<string, number>;
    loading: boolean;
    error: string | undefined;
}

export function useLibraryData(): UseLibraryDataResult {
    const { data, loading, error } = useFetch(getLibraryMedias);
    const addedAtById = useMemo(() => {
        const dates = new Map<string, number>();
        if (!data) return dates;
        for (const { item, addedAt } of [
            ...data.albums,
            ...data.playlists,
            ...data.songs,
            ...data.videos,
            ...data.stations,
            ...data.shared,
        ]) {
            const key = `${item.type}:${item.publicId}`;
            const timestamp = Date.parse(addedAt);
            if (Number.isFinite(timestamp))
                dates.set(key, Math.max(dates.get(key) ?? 0, timestamp));
        }
        return dates;
    }, [data]);

    return {
        albums: data?.albums.map((a) => a.item) ?? [],
        playlists: data?.playlists.map((p) => p.item) ?? [],
        songs: data?.songs.map((s) => s.item) ?? [],
        videos: data?.videos.map((v) => v.item) ?? [],
        stations: data?.stations.map((s) => s.item) ?? [],
        shared: data?.shared.map((s) => s.item) ?? [],
        addedAtById,
        loading,
        error,
    };
}
