import { Directory, File, Paths, type DownloadOptions } from "expo-file-system";
import { getSessionCookie } from "@/lib/api";

const CACHE_DIR = new Directory(Paths.cache, "media_cache");

interface CachedEntry {
    originalUrl: string;
    cachedUri: string;
    publicId: string;
}

class MediaCacheManager {
    private _cache: Map<string, CachedEntry> = new Map();
    private _isDownloading: Set<string> = new Set();

    async ensureCacheDir(): Promise<void> {
        try {
            CACHE_DIR.create();
        } catch {
            // May already exist
        }
    }

    async getCachedUri(url: string, publicId: string): Promise<string | null> {
        console.log("getCacheUri", { url, publicId });
        const entry = this._cache.get(url);
        if (entry && entry.publicId === publicId) {
            const cachedFile = new File(entry.cachedUri);
            if (cachedFile.exists) {
                return entry.cachedUri;
            }
            this._cache.delete(url);
        }
        return null;
    }

    async downloadToCache(
        url: string,
        publicId: string,
        onProgress?: (progress: number) => void
    ): Promise<string | null> {
        console.log("downloadToCache", { url, publicId });
        if (this._isDownloading.has(url)) {
            return null;
        }

        const cachedEntry = this._cache.get(url);
        if (cachedEntry && cachedEntry.publicId === publicId) {
            const cachedFile = new File(cachedEntry.cachedUri);
            if (cachedFile.exists) {
                return cachedEntry.cachedUri;
            }
        }

        this._isDownloading.add(url);

        try {
            await this.ensureCacheDir();
            const extension = this._getExtension(url);

            const cookie = await getSessionCookie();
            const headers: Record<string, string> = {};
            if (cookie) {
                headers.Cookie = `session_id=${cookie}`;
            }

            const options: DownloadOptions = { headers };

            const downloadedFile = await File.downloadFileAsync(
                url,
                CACHE_DIR,
                options
            );

            if (downloadedFile.exists) {
                const entry: CachedEntry = {
                    originalUrl: url,
                    cachedUri: downloadedFile.uri,
                    publicId,
                };
                this._cache.set(url, entry);
                return downloadedFile.uri;
            }

            return null;
        } catch (e) {
            console.warn("MediaCacheManager download failed:", e);
            return null;
        } finally {
            this._isDownloading.delete(url);
        }
    }

    async deleteCached(url: string): Promise<void> {
        console.log("deleteCached", { url });
        const entry = this._cache.get(url);
        if (entry) {
            try {
                const file = new File(entry.cachedUri);
                if (file.exists) {
                    file.delete();
                }
            } catch {
                // Ignore errors
            }
            this._cache.delete(url);
        }
    }

    clearCache(): void {
        this._cache.clear();
    }

    private _getExtension(url: string): string {
        console.log("_getExtension", { url });
        const ext = url.split(".").pop()?.split("?")[0]?.toLowerCase();
        if (ext === "m3u8") return ".m3u8";
        if (ext === "mpd") return ".mpd";
        if (["mp3", "m4a", "aac", "ogg", "wav"].includes(ext ?? "")) {
            return `.${ext}`;
        }
        if (["mp4", "webm", "mkv"].includes(ext ?? "")) {
            return `.${ext}`;
        }
        return ".mp4";
    }
}

export const mediaCacheManager = new MediaCacheManager();
