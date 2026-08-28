import {
    isAlbum,
    isAlbumWithSongs,
    isPlaylist,
    isPlaylistWithMedias,
    isSong,
    type TMedia,
} from "@rockit/shared";
import {
    listOfflineSongRecords,
    pruneOfflineSongParents,
    type OfflineSongRecord,
} from "@/lib/offline/db";
import {
    downloadSongOffline,
    offlineStatusMap,
    removeOfflineSong,
} from "@/lib/offline/store";
import { rockIt } from "@/lib/rockit/rockIt";
import {
    getAlbumAsync,
    getPlaylistAsync,
} from "@/lib/services/mediaService";

type OfflineSongTask = {
    publicId: string;
    audioUrl: string;
    imageUrl: string | null;
    parentAlbumIds: string[];
    parentPlaylistIds: string[];
};

export type OfflineContainerKind = "album" | "playlist";

export class OfflineManager {
    private async resolveAlbumSongs(
        media: TMedia,
        albumId: string
    ): Promise<OfflineSongTask[]> {
        const songs = isAlbumWithSongs(media)
            ? media.songs
            : (await getAlbumAsync(media.publicId))?.songs ?? [];

        return songs
            .filter((s): boolean => Boolean(s.audioUrl))
            .map((s): OfflineSongTask => ({
                publicId: s.publicId,
                audioUrl: s.audioUrl as string,
                imageUrl: s.imageUrl,
                parentAlbumIds: [albumId],
                parentPlaylistIds: [],
            }));
    }

    private async resolvePlaylistSongs(
        media: TMedia,
        playlistId: string
    ): Promise<OfflineSongTask[]> {
        const medias = isPlaylistWithMedias(media)
            ? media.medias
            : (await getPlaylistAsync(media.publicId))?.medias ?? [];

        const tasks: OfflineSongTask[] = [];
        for (const entry of medias) {
            if (!isSong(entry.item)) continue;
            const song = entry.item;
            if (!song.audioUrl) continue;
            const albumId = song.album?.publicId;
            tasks.push({
                publicId: song.publicId,
                audioUrl: song.audioUrl,
                imageUrl: song.imageUrl,
                parentAlbumIds: albumId ? [albumId] : [],
                parentPlaylistIds: [playlistId],
            });
        }
        return tasks;
    }

    private async resolveTasks(media: TMedia): Promise<OfflineSongTask[]> {
        if (isAlbum(media)) {
            return this.resolveAlbumSongs(media, media.publicId);
        }
        if (isPlaylist(media)) {
            return this.resolvePlaylistSongs(media, media.publicId);
        }
        return [];
    }

    /**
     * Return the offline songs that belong to the given album/playlist, by
     * reading the parent references stored locally. This never touches the
     * network: everything needed already lives in IndexedDB.
     */
    async getOfflineSongsFor(
        mediaId: string,
        kind: OfflineContainerKind
    ): Promise<OfflineSongRecord[]> {
        const records = await listOfflineSongRecords();
        return records.filter((record): boolean =>
            kind === "album"
                ? (record.parentAlbumIds ?? []).includes(mediaId)
                : (record.parentPlaylistIds ?? []).includes(mediaId)
        );
    }

    /**
     * Download every song of an album/playlist to the device for offline use,
     * skipping the ones already saved. Parent references are settled at save
     * time so the Offline library chip can group them without network calls.
     */
    async downloadMediaOffline(
        media: TMedia
    ): Promise<{ downloaded: number; failed: number }> {
        const tasks = await this.resolveTasks(media);
        if (tasks.length === 0) {
            rockIt.notificationManager.notifyError(
                rockIt.vocabularyManager.vocabulary.NO_MEDIA_FOUND
            );
            return { downloaded: 0, failed: 0 };
        }

        const pending = tasks.filter(
            (task): boolean =>
                offlineStatusMap.get()[task.publicId] !== "downloaded"
        );

        let downloaded = 0;
        let failed = 0;
        const batch = async (pool: OfflineSongTask[]): Promise<void> => {
            const results = await Promise.allSettled(
                pool.map((task): Promise<void> =>
                    downloadSongOffline(
                        task.publicId,
                        task.audioUrl,
                        task.imageUrl,
                        task.parentAlbumIds,
                        task.parentPlaylistIds
                    )
                )
            );
            for (const result of results) {
                if (result.status === "fulfilled") {
                    downloaded += 1;
                } else {
                    failed += 1;
                    console.error(
                        `Failed to save a song offline. ${
                            result.reason instanceof Error
                                ? result.reason.message
                                : String(result.reason)
                        }`
                    );
                }
            }
        };

        // Bounded concurrency so big albums don't flood the browser/server
        // with one fetch per song all at once.
        const CONCURRENCY = 4;
        for (let i = 0; i < pending.length; i += CONCURRENCY) {
            await batch(pending.slice(i, i + CONCURRENCY));
        }

        const $v = rockIt.vocabularyManager.vocabulary;
        if (failed > 0) {
            rockIt.notificationManager.notifyError(
                `${downloaded} ${$v.OFFLINE_DOWNLOAD_FAILED_SUMMARY}`
            );
        } else if (downloaded > 0) {
            rockIt.notificationManager.notifySuccess(
                `${downloaded} ${$v.OFFLINE_DOWNLOAD_SUMMARY}`
            );
        }

        return { downloaded, failed };
    }

    /**
     * Drop an album/playlist from the Offline library, purely from local data.
     * Removes the parent references from each of its offline songs and fully
     * deletes any song that is left without any parent reference (i.e. no
     * longer needed by another offline album/playlist).
     */
    async removeMediaOffline(media: TMedia): Promise<void> {
        const parentAlbumIds = isAlbum(media) ? [media.publicId] : [];
        const parentPlaylistIds = isPlaylist(media) ? [media.publicId] : [];
        if (parentAlbumIds.length === 0 && parentPlaylistIds.length === 0)
            return;

        const kind: OfflineContainerKind = isAlbum(media)
            ? "album"
            : "playlist";
        const records = await this.getOfflineSongsFor(media.publicId, kind);

        let removed = 0;
        for (const record of records) {
            if (offlineStatusMap.get()[record.publicId] !== "downloaded")
                continue;
            const orphan = await pruneOfflineSongParents(
                record.publicId,
                parentAlbumIds,
                parentPlaylistIds
            );
            if (orphan) {
                await removeOfflineSong(record.publicId);
                removed += 1;
            }
        }

        if (removed > 0) {
            rockIt.notificationManager.notifySuccess(
                `${removed} ${rockIt.vocabularyManager.vocabulary.OFFLINE_REMOVE_SUMMARY}`
            );
        }
    }
}
