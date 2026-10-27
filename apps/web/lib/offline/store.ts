import { map } from "nanostores";
import {
    deleteOfflineSong,
    getOfflineSong,
    listOfflineSongIds,
    saveSongOffline,
    updateOfflineSongPlaylist,
} from "@/lib/offline/db";

type DownloadStatus = "idle" | "downloading" | "downloaded" | "error";

export const offlineStatusMap = map<Record<string, DownloadStatus>>({});

const activeAudioUrls = new Map<string, string>();
const activeCoverUrls = new Map<string, string>();

export async function hydrateOfflineIds(): Promise<void> {
    const ids = await listOfflineSongIds();
    const next: Record<string, DownloadStatus> = {};
    for (const id of ids) next[id] = "downloaded";
    offlineStatusMap.set(next);
}

export async function downloadSongOffline(
    publicId: string,
    audioUrl: string,
    coverUrl: string | null,
    parentAlbumIds: string[] = [],
    parentPlaylistIds: string[] = []
): Promise<void> {
    offlineStatusMap.setKey(publicId, "downloading");
    try {
        await saveSongOffline(
            publicId,
            audioUrl,
            coverUrl,
            parentAlbumIds,
            parentPlaylistIds
        );
        offlineStatusMap.setKey(publicId, "downloaded");
    } catch (err) {
        offlineStatusMap.setKey(publicId, "error");
        throw err;
    }
}

/**
 * Record a playlist↔song relationship for an already-offline song. Used when
 * a song that's saved offline is added to a playlist, so the Offline library
 * chip can later group by that playlist without any network call.
 */
export async function addSongPlaylistRef(
    publicId: string,
    playlistPublicId: string
): Promise<void> {
    await updateOfflineSongPlaylist(publicId, playlistPublicId, true);
}

/**
 * Remove a playlist↔song relationship for an offline song. Used when a song
 * that's saved offline is removed from a playlist, to avoid the Offline chip
 * showing that playlist forever.
 */
export async function removeSongPlaylistRef(
    publicId: string,
    playlistPublicId: string
): Promise<void> {
    await updateOfflineSongPlaylist(publicId, playlistPublicId, false);
}

export async function removeOfflineSong(publicId: string): Promise<void> {
    await deleteOfflineSong(publicId);
    offlineStatusMap.setKey(publicId, "idle");
    const audioUrl = activeAudioUrls.get(publicId);
    if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
        activeAudioUrls.delete(publicId);
    }
    const coverUrl = activeCoverUrls.get(publicId);
    if (coverUrl) {
        URL.revokeObjectURL(coverUrl);
        activeCoverUrls.delete(publicId);
    }
}

export async function resolveOfflineAudioUrl(
    publicId: string
): Promise<string | null> {
    const existing = activeAudioUrls.get(publicId);
    if (existing) return existing;

    const record = await getOfflineSong(publicId);
    if (!record) return null;

    const url = URL.createObjectURL(record.audioBlob);
    activeAudioUrls.set(publicId, url);
    return url;
}

export async function resolveOfflineCoverUrl(
    publicId: string
): Promise<string | null> {
    const existing = activeCoverUrls.get(publicId);
    if (existing) return existing;

    const record = await getOfflineSong(publicId);
    if (!record?.coverBlob) return null;

    const url = URL.createObjectURL(record.coverBlob);
    activeCoverUrls.set(publicId, url);
    return url;
}
