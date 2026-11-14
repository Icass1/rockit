import {
    getOfflineSong,
    getOfflineStorageBytes,
    hasOfflineSong,
    saveOfflineSongCover,
    saveOfflineSongMetadata,
    saveSongOffline,
} from "@rockit/platform-browser/offline/db";
import {
    releaseOfflineUrls,
    removeOfflineSong,
    resolveOfflineAudioUrl,
    resolveOfflineCoverUrl,
} from "@rockit/platform-browser/offline/store";
import type {
    BaseSongWithAlbumResponse,
    BaseSongWithoutAlbumResponse,
} from "@rockit/shared";

class BrowserMediaStorage {
    async init(): Promise<void> {}

    hasMedia(publicId: string): Promise<boolean> {
        return hasOfflineSong(publicId);
    }

    async downloadSong(
        publicId: string,
        url: string,
        coverUrl?: string | null,
        name?: string,
        media?: BaseSongWithAlbumResponse | BaseSongWithoutAlbumResponse
    ): Promise<string | null> {
        await saveSongOffline(publicId, url, coverUrl ?? null, [], [], name);
        if (media) await saveOfflineSongMetadata(media);
        releaseOfflineUrls(publicId);
        void navigator.storage?.persist?.().catch(() => false);
        return (await resolveOfflineAudioUrl(publicId)) ?? null;
    }

    async downloadVideo(
        _publicId: string,
        _url: string
    ): Promise<string | null> {
        return null;
    }

    async getSongUri(publicId: string): Promise<string | null> {
        return (await resolveOfflineAudioUrl(publicId)) ?? null;
    }

    async getVideoUri(_publicId: string): Promise<string | null> {
        return null;
    }

    async deleteSong(publicId: string): Promise<void> {
        await removeOfflineSong(publicId);
    }
    async deleteVideo(_publicId: string): Promise<void> {}
    async deleteMedia(publicId: string): Promise<void> {
        await removeOfflineSong(publicId);
    }

    async downloadImage(publicId: string, url: string): Promise<string | null> {
        const song = await getOfflineSong(publicId);
        if (!song) return null;
        // Audio and artwork belong to the same atomic offline record.
        const image = await fetch(url);
        if (!image.ok) return null;
        await saveOfflineSongCover(publicId, await image.blob());
        releaseOfflineUrls(publicId);
        return (await resolveOfflineCoverUrl(publicId)) ?? null;
    }

    async getImageUri(publicId: string): Promise<string | null> {
        return (await resolveOfflineCoverUrl(publicId)) ?? null;
    }

    async deleteImage(_publicId: string): Promise<void> {}
    async getStorageInfo(): Promise<{
        total: number;
        free: number;
        used: number;
    }> {
        const estimate = await navigator.storage?.estimate();
        return {
            total: estimate?.quota ?? 0,
            free: Math.max(0, (estimate?.quota ?? 0) - (estimate?.usage ?? 0)),
            used: await getOfflineStorageBytes(),
        };
    }
}

export const mediaStorage = new BrowserMediaStorage();
