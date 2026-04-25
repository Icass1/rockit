import {
    cacheDirectory,
    deleteAsync,
    downloadAsync,
    getInfoAsync,
    getTotalDiskCapacityAsync,
    makeDirectoryAsync,
    readDirectoryAsync,
} from "expo-file-system/legacy";

const cacheDir: string | null = cacheDirectory;

const MEDIA_DIR_NAME = "media";
const SONGS_DIR_NAME = "songs";
const VIDEOS_DIR_NAME = "videos";
const IMAGES_DIR_NAME = "images";

async function ensureDir(path: string): Promise<void> {
    const info = await getInfoAsync(path);
    if (!info.exists) {
        await makeDirectoryAsync(path, { intermediates: true });
    }
}

export interface MediaStorageInfo {
    localUri: string | null;
    exists: boolean;
    size: number;
}

class MediaStorageManager {
    private _initialized = false;

    async init(): Promise<void> {
        if (this._initialized) return;

        const baseDir = cacheDir ?? "";
        await ensureDir(`${baseDir}${MEDIA_DIR_NAME}`);
        await ensureDir(`${baseDir}${MEDIA_DIR_NAME}/${SONGS_DIR_NAME}`);
        await ensureDir(`${baseDir}${MEDIA_DIR_NAME}/${VIDEOS_DIR_NAME}`);
        await ensureDir(`${baseDir}${MEDIA_DIR_NAME}/${IMAGES_DIR_NAME}`);

        this._initialized = true;
    }

    async downloadSong(
        publicId: string,
        url: string,
        onProgress?: (progress: number) => void
    ): Promise<string | null> {
        await this.init();

        const baseDir = cacheDir ?? "";
        const filename = this._getFilename(publicId, url, "song");
        const localPath = `${baseDir}${MEDIA_DIR_NAME}/${SONGS_DIR_NAME}/${filename}`;

        const info = await getInfoAsync(localPath);
        if (info.exists) {
            return localPath;
        }

        try {
            const downloadResult = await downloadAsync(url, localPath, {
                md5: false,
            });
            if (downloadResult.status === 200) {
                return downloadResult.uri;
            }
            return null;
        } catch (e) {
            console.warn("MediaStorageManager.downloadSong failed:", e);
            return null;
        }
    }

    async downloadVideo(
        publicId: string,
        url: string,
        onProgress?: (progress: number) => void
    ): Promise<string | null> {
        await this.init();

        const baseDir = cacheDir ?? "";
        const filename = this._getFilename(publicId, url, "video");
        const localPath = `${baseDir}${MEDIA_DIR_NAME}/${VIDEOS_DIR_NAME}/${filename}`;

        const info = await getInfoAsync(localPath);
        if (info.exists) {
            return localPath;
        }

        try {
            const downloadResult = await downloadAsync(url, localPath, {
                md5: false,
            });
            if (downloadResult.status === 200) {
                return downloadResult.uri;
            }
            return null;
        } catch (e) {
            console.warn("MediaStorageManager.downloadVideo failed:", e);
            return null;
        }
    }

    async getSongUri(publicId: string): Promise<string | null> {
        await this.init();

        const baseDir = cacheDir ?? "";
        const songsDir = `${baseDir}${MEDIA_DIR_NAME}/${SONGS_DIR_NAME}`;

        const dirInfo = await getInfoAsync(songsDir);
        if (!dirInfo.exists) return null;

        const files = await readDirectoryAsync(songsDir);
        for (const fileName of files) {
            if (fileName.startsWith(publicId)) {
                const filePath = `${songsDir}/${fileName}`;
                const fileInfo = await getInfoAsync(filePath);
                if (fileInfo.exists) {
                    return filePath;
                }
            }
        }
        return null;
    }

    async getVideoUri(publicId: string): Promise<string | null> {
        await this.init();

        const baseDir = cacheDir ?? "";
        const videosDir = `${baseDir}${MEDIA_DIR_NAME}/${VIDEOS_DIR_NAME}`;

        const dirInfo = await getInfoAsync(videosDir);
        if (!dirInfo.exists) return null;

        const files = await readDirectoryAsync(videosDir);
        for (const fileName of files) {
            if (fileName.startsWith(publicId)) {
                const filePath = `${videosDir}/${fileName}`;
                const fileInfo = await getInfoAsync(filePath);
                if (fileInfo.exists) {
                    return filePath;
                }
            }
        }
        return null;
    }

    async deleteSong(publicId: string): Promise<void> {
        const uri = await this.getSongUri(publicId);
        if (uri) {
            await deleteAsync(uri, { idempotent: true });
        }
    }

    async deleteVideo(publicId: string): Promise<void> {
        const uri = await this.getVideoUri(publicId);
        if (uri) {
            await deleteAsync(uri, { idempotent: true });
        }
    }

    async deleteMedia(publicId: string): Promise<void> {
        await Promise.all([
            this.deleteSong(publicId),
            this.deleteVideo(publicId),
        ]);
    }

    async downloadImage(
        publicId: string,
        url: string
    ): Promise<string | null> {
        await this.init();

        const baseDir = cacheDir ?? "";
        const ext = url.split(".").pop()?.split("?")[0]?.toLowerCase();
        const safeExt = ["jpg", "jpeg", "png", "webp", "gif"].includes(
            ext ?? ""
        )
            ? `.${ext}`
            : ".jpg";
        const localPath = `${baseDir}${MEDIA_DIR_NAME}/${IMAGES_DIR_NAME}/${publicId}${safeExt}`;

        const info = await getInfoAsync(localPath);
        if (info.exists) return localPath;

        try {
            const result = await downloadAsync(url, localPath, { md5: false });
            if (result.status === 200) return result.uri;
            return null;
        } catch (e) {
            console.warn("MediaStorageManager.downloadImage failed:", e);
            return null;
        }
    }

    async getImageUri(publicId: string): Promise<string | null> {
        await this.init();

        const baseDir = cacheDir ?? "";
        const imagesDir = `${baseDir}${MEDIA_DIR_NAME}/${IMAGES_DIR_NAME}`;

        const dirInfo = await getInfoAsync(imagesDir);
        if (!dirInfo.exists) return null;

        const files = await readDirectoryAsync(imagesDir);
        for (const fileName of files) {
            if (fileName.startsWith(publicId)) {
                const filePath = `${imagesDir}/${fileName}`;
                const fileInfo = await getInfoAsync(filePath);
                if (fileInfo.exists) return filePath;
            }
        }
        return null;
    }

    async deleteImage(publicId: string): Promise<void> {
        const uri = await this.getImageUri(publicId);
        if (uri) await deleteAsync(uri, { idempotent: true });
    }

    async getStorageInfo(): Promise<{
        total: number;
        free: number;
        used: number;
    }> {
        const total = await getTotalDiskCapacityAsync();
        return {
            total,
            free: total * 0.5,
            used: total * 0.5,
        };
    }

    private _getFilename(
        publicId: string,
        url: string,
        type: "song" | "video"
    ): string {
        const ext = url.split(".").pop()?.split("?")[0]?.toLowerCase();

        let extension = ".mp4";
        if (type === "song") {
            if (ext === "m3u8") extension = ".m3u8";
            else if (ext === "mpd") extension = ".mpd";
            else if (["mp3", "m4a", "aac", "ogg", "wav"].includes(ext ?? "")) {
                extension = `.${ext}`;
            }
        } else {
            if (ext === "m3u8") extension = ".m3u8";
            else if (ext === "mpd") extension = ".mpd";
            else if (["mp4", "webm", "mkv"].includes(ext ?? "")) {
                extension = `.${ext}`;
            }
        }

        return `${publicId}${extension}`;
    }
}

export const mediaStorage = new MediaStorageManager();
