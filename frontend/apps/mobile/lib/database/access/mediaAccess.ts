import {
    EMediaType,
    isAlbum,
    isSong,
    isSongWithAlbum,
    isVideo,
    TMedia,
} from "@rockit/shared";
import { mediaStorage } from "@/lib/storage/mediaStorage";
import { getDb } from "../db";
import { type Media, type NewMedia } from "../schema";

const now = () => Math.floor(Date.now() / 1000);

// expo-sqlite returns raw snake_case column names; this converts them to the camelCase Media type
function mapMediaRow(row: any): Media {
    return {
        id: row.id,
        publicId: row.public_id,
        providerId: row.provider_id,
        provider: row.provider,
        mediaTypeKey: row.media_type_key,
        mediaType: row.media_type,
        name: row.name,
        url: row.url,
        providerUrl: row.provider_url,
        imageUrl: row.image_url,
        durationMs: row.duration_ms,
        audioSrc: row.audio_src,
        videoSrc: row.video_src,
        artists: row.artists,
        albumPublicId: row.album_public_id,
        albumName: row.album_name,
        releaseDate: row.release_date,
        discNumber: row.disc_number,
        trackNumber: row.track_number,
        downloaded: !!row.downloaded,
        localFilePath: row.local_file_path,
        localImagePath: row.local_image_path,
        dateUpdated: row.date_updated,
        dateAdded: row.date_added,
    };
}

export async function getMediaById(mediaId: number): Promise<Media | null> {
    const db = getDb();
    const result = db.getFirstSync<any>(
        "SELECT * FROM media WHERE id = ?",
        mediaId
    );
    return result ? mapMediaRow(result) : null;
}

export async function getMediaByPublicId(
    publicId: string
): Promise<Media | null> {
    const db = getDb();
    const result = db.getFirstSync<any>(
        "SELECT * FROM media WHERE public_id = ?",
        publicId
    );
    return result ? mapMediaRow(result) : null;
}

export async function getMediaByPublicIdWithLock(
    publicId: string
): Promise<Media | null> {
    const db = getDb();
    db.execSync("BEGIN IMMEDIATE");
    try {
        const result = db.getFirstSync<any>(
            "SELECT * FROM media WHERE public_id = ? FOR UPDATE",
            publicId
        );
        return result ? mapMediaRow(result) : null;
    } finally {
        db.execSync("COMMIT");
    }
}

export async function getSongsByAlbumPublicId(
    albumPublicId: string
): Promise<Media[]> {
    const db = getDb();
    const results = db.getAllSync<any>(
        "SELECT * FROM media WHERE album_public_id = ? AND media_type = ? ORDER BY disc_number, track_number",
        albumPublicId,
        EMediaType.Song
    );
    return results.map(mapMediaRow);
}

export async function getSongsByArtistPublicId(
    artistPublicId: string
): Promise<Media[]> {
    const db = getDb();
    const results = db.getAllSync<any>(
        `SELECT * FROM media WHERE artists LIKE ? AND media_type = ? ORDER BY date_added DESC`,
        `%${artistPublicId}%`
    );
    return results.map(mapMediaRow);
}

export async function getVideosByArtistPublicId(
    artistPublicId: string
): Promise<Media[]> {
    const db = getDb();
    const results = db.getAllSync<any>(
        `SELECT * FROM media WHERE artists LIKE ? AND media_type = ? ORDER BY date_added DESC`,
        `%${artistPublicId}%`,
        EMediaType.Video
    );
    return results.map(mapMediaRow);
}

export async function getRecentMediaByUser(
    userId: number,
    limit: number = 50
): Promise<Media[]> {
    const db = getDb();
    const results = db.getAllSync<any>(
        `SELECT m.* FROM media m
         INNER JOIN library_media lm ON m.id = lm.media_id
         WHERE lm.user_id = ? AND lm.library_type = 'recent'
         ORDER BY lm.date_added DESC
         LIMIT ?`,
        userId,
        limit
    );
    return results.map(mapMediaRow);
}

export async function getDownloadedMediaByUser(
    userId: number,
    limit: number = 50
): Promise<Media[]> {
    const db = getDb();
    const results = db.getAllSync<any>(
        `SELECT m.* FROM media m
         INNER JOIN library_media lm ON m.id = lm.media_id
         WHERE lm.user_id = ? AND lm.library_type = 'downloaded'
         ORDER BY lm.date_added DESC
         LIMIT ?`,
        userId,
        limit
    );
    return results.map(mapMediaRow);
}

export async function getLikedMediaByUser(
    userId: number,
    mediaType: EMediaType | null = null,
    limit: number = 50
): Promise<Media[]> {
    const db = getDb();
    let query = `SELECT m.* FROM media m
         INNER JOIN library_media lm ON m.id = lm.media_id
         WHERE lm.user_id = ? AND lm.library_type = 'liked'`;
    const params: (number | string)[] = [userId];

    if (mediaType) {
        query += " AND m.media_type = ?";
        params.push(mediaType);
    }

    query += " ORDER BY lm.date_added DESC LIMIT ?";
    params.push(limit);

    const results = db.getAllSync<any>(query, params);
    return results.map(mapMediaRow);
}

export async function createMedia(
    m: Omit<NewMedia, "id" | "dateUpdated" | "dateAdded">
): Promise<Media> {
    const db = getDb();
    const timestamp = now();
    const result = db.runSync(
        `INSERT INTO media (public_id, provider_id, provider, media_type_key, media_type, name, url, provider_url, image_url, duration_ms, audio_src, video_src, artists, album_public_id, album_name, release_date, disc_number, track_number, downloaded, local_file_path, date_updated, date_added)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        m.publicId ?? null,
        m.providerId ?? null,
        m.provider ?? null,
        m.mediaTypeKey ?? null,
        m.mediaType ?? null,
        m.name ?? null,
        m.url ?? null,
        m.providerUrl ?? null,
        m.imageUrl ?? null,
        m.durationMs ?? null,
        m.audioSrc ?? null,
        m.videoSrc ?? null,
        m.artists ?? null,
        m.albumPublicId ?? null,
        m.albumName ?? null,
        m.releaseDate ?? null,
        m.discNumber ?? null,
        m.trackNumber ?? null,
        m.downloaded ? 1 : 0,
        m.localFilePath ?? null,
        timestamp,
        timestamp
    );
    return {
        ...m,
        id: result.lastInsertRowId,
        dateUpdated: timestamp,
        dateAdded: timestamp,
    } as Media;
}

const MEDIA_TYPE_KEY_SONG = 0;
const MEDIA_TYPE_KEY_ALBUM = 1;
const MEDIA_TYPE_KEY_VIDEO = 2;

function getMediaTypeKey(media: TMedia): number {
    if (isSong(media)) return MEDIA_TYPE_KEY_SONG;
    if (isAlbum(media)) return MEDIA_TYPE_KEY_ALBUM;
    if (isVideo(media)) return MEDIA_TYPE_KEY_VIDEO;
    return -1;
}

export async function createMediaFromDTO(media: TMedia): Promise<Media> {
    const existingMedia = await getMediaByPublicId(media.publicId);
    if (existingMedia) {
        return existingMedia;
    }

    const mediaTypeKey = getMediaTypeKey(media);
    let dbData: Omit<NewMedia, "id" | "dateUpdated" | "dateAdded">;

    if (isSongWithAlbum(media)) {
        dbData = {
            publicId: media.publicId,
            providerId: 0,
            provider: media.provider,
            mediaTypeKey,
            mediaType: "song",
            name: media.name,
            url: media.audioSrc ?? undefined,
            providerUrl: media.providerUrl,
            imageUrl: media.imageUrl,
            durationMs: media.duration_ms,
            audioSrc: media.audioSrc ?? undefined,
            videoSrc: undefined,
            artists: JSON.stringify(media.artists),
            albumPublicId: media.album.publicId,
            albumName: media.album.name,
            releaseDate: media.album.releaseDate,
            discNumber: media.discNumber,
            trackNumber: media.trackNumber,
            downloaded: media.downloaded,
            localFilePath: undefined,
        };
    } else if (isAlbum(media)) {
        dbData = {
            publicId: media.publicId,
            providerId: 0,
            provider: media.provider,
            mediaTypeKey,
            mediaType: "album",
            name: media.name,
            url: undefined,
            providerUrl: media.imageUrl,
            imageUrl: media.imageUrl,
            durationMs: undefined,
            audioSrc: undefined,
            videoSrc: undefined,
            artists: JSON.stringify(media.artists),
            albumPublicId: undefined,
            albumName: media.name,
            releaseDate: media.releaseDate,
            discNumber: undefined,
            trackNumber: undefined,
            downloaded: false,
            localFilePath: undefined,
        };
    } else if (isVideo(media)) {
        dbData = {
            publicId: media.publicId,
            providerId: 0,
            provider: media.provider,
            mediaTypeKey,
            mediaType: "video",
            name: media.name,
            url: undefined,
            providerUrl: media.providerUrl,
            imageUrl: media.imageUrl,
            durationMs: media.duration_ms,
            audioSrc: undefined,
            videoSrc: media.videoSrc ?? undefined,
            artists: JSON.stringify(media.artists),
            albumPublicId: undefined,
            albumName: undefined,
            releaseDate: undefined,
            discNumber: undefined,
            trackNumber: undefined,
            downloaded: false,
            localFilePath: undefined,
        };
    } else {
        throw new Error(`Unsupported media type: ${(media as TMedia).type}`);
    }

    const created = await createMedia(dbData);

    // Download media image in background
    if (media.imageUrl) {
        mediaStorage
            .downloadImage(media.publicId, media.imageUrl)
            .then((localPath) => {
                if (localPath) updateMediaLocalImagePath(created.id, localPath);
            });
    }

    return created;
}

export async function updateMedia(
    mediaId: number,
    updates: any
): Promise<void> {
    const db = getDb();
    const timestamp = now();

    const fields: string[] = ["date_updated = ?"];
    const values: (string | number | null)[] = [timestamp];

    if (updates.name !== undefined) {
        fields.push("name = ?");
        values.push(updates.name);
    }
    if (updates.url !== undefined) {
        fields.push("url = ?");
        values.push(updates.url);
    }
    if (updates.providerUrl !== undefined) {
        fields.push("provider_url = ?");
        values.push(updates.providerUrl);
    }
    if (updates.imageUrl !== undefined) {
        fields.push("image_url = ?");
        values.push(updates.imageUrl);
    }
    if (updates.durationMs !== undefined) {
        fields.push("duration_ms = ?");
        values.push(updates.durationMs);
    }
    if (updates.audioSrc !== undefined) {
        fields.push("audio_src = ?");
        values.push(updates.audioSrc);
    }
    if (updates.videoSrc !== undefined) {
        fields.push("video_src = ?");
        values.push(updates.videoSrc);
    }
    if (updates.artists !== undefined) {
        fields.push("artists = ?");
        values.push(updates.artists);
    }
    if (updates.albumPublicId !== undefined) {
        fields.push("album_public_id = ?");
        values.push(updates.albumPublicId);
    }
    if (updates.albumName !== undefined) {
        fields.push("album_name = ?");
        values.push(updates.albumName);
    }
    if (updates.releaseDate !== undefined) {
        fields.push("release_date = ?");
        values.push(updates.releaseDate);
    }
    if (updates.discNumber !== undefined) {
        fields.push("disc_number = ?");
        values.push(updates.discNumber);
    }
    if (updates.trackNumber !== undefined) {
        fields.push("track_number = ?");
        values.push(updates.trackNumber);
    }
    if (updates.downloaded !== undefined) {
        fields.push("downloaded = ?");
        values.push(updates.downloaded ? 1 : 0);
    }
    if (updates.localFilePath !== undefined) {
        fields.push("local_file_path = ?");
        values.push(updates.localFilePath);
    }

    values.push(mediaId);
    db.runSync(`UPDATE media SET ${fields.join(", ")} WHERE id = ?`, values);
}

export async function markMediaDownloaded(
    mediaId: number,
    localFilePath: string
): Promise<void> {
    const db = getDb();
    db.runSync(
        "UPDATE media SET downloaded = 1, local_file_path = ?, date_updated = ? WHERE id = ?",
        localFilePath,
        now(),
        mediaId
    );
}

export async function updateMediaLocalImagePath(
    mediaId: number,
    localImagePath: string
): Promise<void> {
    const db = getDb();
    db.runSync(
        "UPDATE media SET local_image_path = ?, date_updated = ? WHERE id = ?",
        localImagePath,
        now(),
        mediaId
    );
}

export async function unmarkMediaDownloaded(mediaId: number): Promise<void> {
    const db = getDb();
    db.runSync(
        "UPDATE media SET downloaded = 0, local_file_path = NULL, date_updated = ? WHERE id = ?",
        now(),
        mediaId
    );
}

export async function deleteMedia(mediaId: number): Promise<void> {
    const db = getDb();
    db.runSync("DELETE FROM media WHERE id = ?", mediaId);
}

export async function searchMedia(
    query: string,
    limit: number = 20
): Promise<Media[]> {
    const db = getDb();
    const searchPattern = `%${query}%`;
    const results = db.getAllSync<any>(
        "SELECT * FROM media WHERE name LIKE ? ORDER BY name LIMIT ?",
        searchPattern,
        limit
    );
    return results.map(mapMediaRow);
}

export async function getAllMedia(limit: number = 100): Promise<Media[]> {
    const db = getDb();
    const results = db.getAllSync<any>(
        "SELECT * FROM media ORDER BY date_added DESC LIMIT ?",
        limit
    );
    return results.map(mapMediaRow);
}

export async function getMediaCount(): Promise<number> {
    const db = getDb();
    const result = db.getFirstSync<{ count: number }>(
        "SELECT COUNT(*) as count FROM media"
    );
    return result?.count ?? 0;
}
