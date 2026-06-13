import { Platform } from "react-native";
import { getSessionCookie } from "@/lib/api";

const IS_NATIVE = Platform.OS === "ios" || Platform.OS === "android";

interface CachedEntry {
    originalUrl: string;
    cachedUri: string;
    publicId: string;
}

function createNativeDir() {
    try {
        const { Directory, Paths } = require("expo-file-system");
        return new Directory(Paths.cache, "media_cache");
    } catch {
        return null;
    }
}

class MediaCacheManager {
    private _cache: Map<string, CachedEntry> = new Map();
    private _isDownloading: Set<string> = new Set();
    private _cacheDir: ReturnType<typeof createNativeDir> | null = null;

    private _getCacheDir() {
        if (!this._cacheDir) {
            this._cacheDir = createNativeDir();
        }
        return this._cacheDir;
    }

    async ensureCacheDir(): Promise<void> {
        if (!IS_NATIVE) return;
        const dir = this._getCacheDir();
        if (!dir) return;
        try {
            dir.create();
        } catch {
            // May already exist
        }
    }

    async getCachedUri(url: string, publicId: string): Promise<string | null> {
        if (!IS_NATIVE) return null;
        const entry = this._cache.get(url);
        if (entry && entry.publicId === publicId) {
            try {
                const { File } = require("expo-file-system");
                const cachedFile = new File(entry.cachedUri);
                if (cachedFile.exists) {
                    return entry.cachedUri;
                }
            } catch {
                // Fall through
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
        if (!IS_NATIVE) return url;
        if (this._isDownloading.has(url)) {
            return null;
        }

        const cachedEntry = this._cache.get(url);
        if (cachedEntry && cachedEntry.publicId === publicId) {
            try {
                const { File } = require("expo-file-system");
                const cachedFile = new File(cachedEntry.cachedUri);
                if (cachedFile.exists) {
                    return cachedEntry.cachedUri;
                }
            } catch {
                // Fall through
            }
        }

        this._isDownloading.add(url);

        try {
            await this.ensureCacheDir();
            const dir = this._getCacheDir();
            if (!dir) return url;

            const { File } = require("expo-file-system");

            const cookie = await getSessionCookie();
            const headers: Record<string, string> = {};
            if (cookie) {
                headers.Cookie = `session_id=${cookie}`;
            }

            const options = { headers };

            const downloadedFile = await File.downloadFileAsync(
                url,
                dir,
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
        if (!IS_NATIVE) return;
        const entry = this._cache.get(url);
        if (entry) {
            try {
                const { File } = require("expo-file-system");
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
