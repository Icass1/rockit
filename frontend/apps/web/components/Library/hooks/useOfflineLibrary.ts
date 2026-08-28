"use client";

import { useEffect, useState } from "react";
import { useStore } from "@nanostores/react";
import {
    BaseAlbumWithoutSongsResponse,
    BasePlaylistWithoutMediasResponse,
    BaseSongWithAlbumResponse,
    BaseVideoResponse,
} from "@/dto";
import { listOfflineSongRecords } from "@/lib/offline/db";
import { offlineStatusMap } from "@/lib/offline/store";

export interface IOfflineLibrary {
    songs: BaseSongWithAlbumResponse[];
    albums: BaseAlbumWithoutSongsResponse[];
    playlists: BasePlaylistWithoutMediasResponse[];
    videos: BaseVideoResponse[];
    totalCount: number;
}

/**
 * Computes the set of library media that is available offline, entirely from
 * local IndexedDB data — no network calls, so it works on airplane mode.
 *
 * Songs are matched against `offlineStatusMap` directly. Albums / playlists
 * are matched per the parent references recorded at save time, so only media
 * that was saved offline along with a known parent (or whose playlist
 * relationship was kept in sync) will show up.
 *
 * The IndexedDB read is lazy: it only runs once the "enabled" flag is true
 * (e.g. the Offline chip is active) and is refreshed whenever the offline
 * status map changes, so the 99% of library visits that never touch the chip
 * pay no cost.
 */
export function useOfflineLibrary({
    enabled,
    songs,
    albums,
    playlists,
    videos,
}: {
    enabled: boolean;
    songs: BaseSongWithAlbumResponse[];
    albums: BaseAlbumWithoutSongsResponse[];
    playlists: BasePlaylistWithoutMediasResponse[];
    videos: BaseVideoResponse[];
}): IOfflineLibrary {
    const $status = useStore(offlineStatusMap);

    const [offlineAlbumIds, setOfflineAlbumIds] = useState<Set<string>>(
        () => new Set()
    );
    const [offlinePlaylistIds, setOfflinePlaylistIds] = useState<Set<string>>(
        () => new Set()
    );

    // Lazy + reactive: read the parent references only when the chip is
    // enabled, reusing the last result otherwise.
    useEffect((): (() => void) | undefined => {
        if (!enabled) return;

        let cancelled = false;
        listOfflineSongRecords()
            .then((records): void => {
                if (cancelled) return;
                const albumIds = new Set<string>();
                const playlistIds = new Set<string>();
                for (const record of records) {
                    for (const id of record.parentAlbumIds ?? [])
                        albumIds.add(id);
                    for (const id of record.parentPlaylistIds ?? [])
                        playlistIds.add(id);
                }
                setOfflineAlbumIds(albumIds);
                setOfflinePlaylistIds(playlistIds);
            })
            .catch(() => {});

        return (): void => {
            cancelled = true;
        };
    }, [enabled, $status]);

    const offlineSongs = enabled
        ? songs.filter(
              (s): boolean => $status[s.publicId] === "downloaded"
          )
        : [];
    const offlineAlbums = enabled
        ? albums.filter((a): boolean => offlineAlbumIds.has(a.publicId))
        : [];
    const offlinePlaylists = enabled
        ? playlists.filter(
              (p): boolean => offlinePlaylistIds.has(p.publicId)
          )
        : [];
    const offlineVideos = enabled
        ? videos.filter(
              (v): boolean => $status[v.publicId] === "downloaded"
          )
        : [];

    return {
        songs: offlineSongs,
        albums: offlineAlbums,
        playlists: offlinePlaylists,
        videos: offlineVideos,
        totalCount:
            offlineSongs.length +
            offlineAlbums.length +
            offlinePlaylists.length +
            offlineVideos.length,
    };
}
