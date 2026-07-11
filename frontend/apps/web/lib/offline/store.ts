import { map } from "nanostores";
import {
    saveSongOffline,
    deleteOfflineSong,
    listOfflineSongIds,
    getOfflineSong,
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
    coverUrl: string | null
): Promise<void> {
    offlineStatusMap.setKey(publicId, "downloading");
    try {
        await saveSongOffline(publicId, audioUrl, coverUrl);
        offlineStatusMap.setKey(publicId, "downloaded");
    } catch (err) {
        offlineStatusMap.setKey(publicId, "error");
        throw err;
    }
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
