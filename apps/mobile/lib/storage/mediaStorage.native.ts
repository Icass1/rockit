import { Directory, File, Paths } from "expo-file-system";

const MEDIA_DIR_NAME = "media";
const SONGS_DIR_NAME = "songs";
const VIDEOS_DIR_NAME = "videos";
const IMAGES_DIR_NAME = "images";

class MediaStorageManager {
    private _initialized = false;
    private _baseDir: Directory;

    constructor() {
        this._baseDir = new Directory(Paths.document, MEDIA_DIR_NAME);
    }

    async init(): Promise<void> {
        if (this._initialized) return;

        try {
            this._baseDir.create({ idempotent: true });

            const songsDir = new Directory(this._baseDir, SONGS_DIR_NAME);
            const videosDir = new Directory(this._baseDir, VIDEOS_DIR_NAME);
            const imagesDir = new Directory(this._baseDir, IMAGES_DIR_NAME);

            await Promise.all([
                songsDir.create({ idempotent: true }),
                videosDir.create({ idempotent: true }),
                imagesDir.create({ idempotent: true }),
            ]);

            this._initialized = true;
        } catch (e) {
            console.warn("MediaStorageManager.init failed:", e);
        }
    }

    async downloadSong(publicId: string, url: string): Promise<string | null> {
        await this.init();

        const songsDir = new Directory(this._baseDir, SONGS_DIR_NAME);
        const filename = this._getFilename(publicId, url, "song");
        const existingFile = new File(songsDir, filename);

        if (existingFile.exists) {
            return existingFile.uri;
        }

        try {
            const file = new File(songsDir, filename);
            const downloadedFile = await File.downloadFileAsync(url, file);
            if (downloadedFile.exists) {
                return downloadedFile.uri;
            }
            return null;
        } catch (e) {
            console.warn("MediaStorageManager.downloadSong failed:", e);
            return null;
        }
    }

    async downloadVideo(publicId: string, url: string): Promise<string | null> {
        await this.init();

        const videosDir = new Directory(this._baseDir, VIDEOS_DIR_NAME);
        const filename = this._getFilename(publicId, url, "video");
        const existingFile = new File(videosDir, filename);

        if (existingFile.exists) {
            return existingFile.uri;
        }

        try {
            const file = new File(videosDir, filename);
            const downloadedFile = await File.downloadFileAsync(url, file);
            if (downloadedFile.exists) {
                return downloadedFile.uri;
            }
            return null;
        } catch (e) {
            console.warn("MediaStorageManager.downloadVideo failed:", e);
            return null;
        }
    }

    async getSongUri(publicId: string): Promise<string | null> {
        await this.init();

        const songsDir = new Directory(this._baseDir, SONGS_DIR_NAME);
        if (!songsDir.exists) return null;

        const contents = songsDir.list();
        for (const entry of contents) {
            if (entry instanceof File && entry.name.startsWith(publicId)) {
                if (entry.exists) {
                    return entry.uri;
                }
            }
        }
        return null;
    }

    async getVideoUri(publicId: string): Promise<string | null> {
        await this.init();

        const videosDir = new Directory(this._baseDir, VIDEOS_DIR_NAME);
        if (!videosDir.exists) return null;

        const contents = videosDir.list();
        for (const entry of contents) {
            if (entry instanceof File && entry.name.startsWith(publicId)) {
                if (entry.exists) {
                    return entry.uri;
                }
            }
        }
        return null;
    }

    async deleteSong(publicId: string): Promise<void> {
        const uri = await this.getSongUri(publicId);
        if (uri) {
            const file = new File(uri);
            file.delete();
        }
    }

    async deleteVideo(publicId: string): Promise<void> {
        const uri = await this.getVideoUri(publicId);
        if (uri) {
            const file = new File(uri);
            file.delete();
        }
    }

    async deleteMedia(publicId: string): Promise<void> {
        await Promise.all([
            this.deleteSong(publicId),
            this.deleteVideo(publicId),
        ]);
    }

    async downloadImage(publicId: string, url: string): Promise<string | null> {
        await this.init();

        const imagesDir = new Directory(this._baseDir, IMAGES_DIR_NAME);
        const ext = url.split(".").pop()?.split("?")[0]?.toLowerCase();
        const safeExt = ["jpg", "jpeg", "png", "webp", "gif"].includes(
            ext ?? ""
        )
            ? `.${ext}`
            : ".jpg";
        const filename = `${publicId}${safeExt}`;
        const existingFile = new File(imagesDir, filename);

        if (existingFile.exists) return existingFile.uri;

        try {
            const file = new File(imagesDir, filename);
            const result = await File.downloadFileAsync(url, file);
            if (result.exists) return result.uri;
            return null;
        } catch (e) {
            console.warn("MediaStorageManager.downloadImage failed:", e);
            return null;
        }
    }

    async getImageUri(publicId: string): Promise<string | null> {
        await this.init();

        const imagesDir = new Directory(this._baseDir, IMAGES_DIR_NAME);
        if (!imagesDir.exists) return null;

        const contents = imagesDir.list();
        for (const entry of contents) {
            if (entry instanceof File && entry.name.startsWith(publicId)) {
                if (entry.exists) return entry.uri;
            }
        }
        return null;
    }

    async deleteImage(publicId: string): Promise<void> {
        const uri = await this.getImageUri(publicId);
        if (uri) {
            const file = new File(uri);
            file.delete();
        }
    }

    async getStorageInfo(): Promise<{
        total: number;
        free: number;
        used: number;
    }> {
        return { total: 0, free: 0, used: 0 };
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
