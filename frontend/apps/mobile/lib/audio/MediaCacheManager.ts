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

    /**
     * Deterministic filename for a url so a file cached in a previous session
     * can be located on disk even though the in-memory map starts empty. Keyed
     * on the media publicId (unique per audio track) plus the url's extension.
     */
    private _fileNameFor(url: string, publicId: string): string {
        const safeId = publicId.replace(/[^a-zA-Z0-9_-]/g, "_");
        return `${safeId}${this._getExtension(url)}`;
    }

    private _cachedFileFor(url: string, publicId: string) {
        const dir = this._getCacheDir();
        if (!dir) return null;
        try {
            const { File } = require("expo-file-system");
            return new File(dir, this._fileNameFor(url, publicId));
        } catch {
            return null;
        }
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

        // The in-memory map is empty after a restart; adopt a file cached in a
        // previous session by looking it up at its deterministic path on disk.
        const diskFile = this._cachedFileFor(url, publicId);
        if (diskFile) {
            try {
                if (diskFile.exists) {
                    this._cache.set(url, {
                        originalUrl: url,
                        cachedUri: diskFile.uri,
                        publicId,
                    });
                    return diskFile.uri;
                }
            } catch {
                // Fall through
            }
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

        // Reuse an already cached file (this session's map or a previous
        // session's file on disk) instead of downloading over it — otherwise
        // downloadFileAsync rejects with "Destination already exists".
        const existing = await this.getCachedUri(url, publicId);
        if (existing) return existing;

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

            // Download to a deterministic path so the file can be found again
            // after a restart. `idempotent` overwrites any stale/partial file
            // left behind rather than throwing.
            const destination = new File(
                dir,
                this._fileNameFor(url, publicId)
            );
            const options = { headers, idempotent: true };

            const downloadedFile = await File.downloadFileAsync(
                url,
                destination,
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
