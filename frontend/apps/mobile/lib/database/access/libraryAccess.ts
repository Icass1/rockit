import { getDb } from "../db";
import {
    libraryTypeDownloaded,
    libraryTypeLiked,
    libraryTypeRecent,
    type LibraryMedia as LibraryMediaType,
} from "../schema";

export { libraryTypeLiked };

const now = () => Math.floor(Date.now() / 1000);

export async function addToLibrary(
    userId: number,
    mediaId: number,
    libraryType:
        | typeof libraryTypeLiked
        | typeof libraryTypeDownloaded
        | typeof libraryTypeRecent
): Promise<void> {
    const db = getDb();
    const timestamp = now();
    db.runSync(
        `INSERT OR IGNORE INTO library_media (user_id, media_id, library_type, date_added)
         VALUES (?, ?, ?, ?)`,
        userId,
        mediaId,
        libraryType,
        timestamp
    );
}

export async function removeFromLibrary(
    userId: number,
    mediaId: number,
    libraryType:
        | typeof libraryTypeLiked
        | typeof libraryTypeDownloaded
        | typeof libraryTypeRecent
): Promise<void> {
    const db = getDb();
    db.runSync(
        "DELETE FROM library_media WHERE user_id = ? AND media_id = ? AND library_type = ?",
        userId,
        mediaId,
        libraryType
    );
}

export async function isInLibrary(
    userId: number,
    mediaId: number,
    libraryType:
        | typeof libraryTypeLiked
        | typeof libraryTypeDownloaded
        | typeof libraryTypeRecent
): Promise<boolean> {
    const db = getDb();
    const result = db.getFirstSync<{ exists: number }>(
        "SELECT 1 as exists FROM library_media WHERE user_id = ? AND media_id = ? AND library_type = ?",
        userId,
        mediaId,
        libraryType
    );
    return !!result;
}

export async function getLibraryMedia(
    userId: number,
    libraryType:
        | typeof libraryTypeLiked
        | typeof libraryTypeDownloaded
        | typeof libraryTypeRecent
): Promise<LibraryMediaType[]> {
    const db = getDb();
    const results = db.getAllSync<LibraryMediaType>(
        "SELECT * FROM library_media WHERE user_id = ? AND library_type = ? ORDER BY date_added DESC",
        userId,
        libraryType
    );
    return results;
}

export async function getUserLikedMediaIds(userId: number): Promise<number[]> {
    const db = getDb();
    const results = db.getAllSync<{ mediaId: number }>(
        "SELECT media_id FROM library_media WHERE user_id = ? AND library_type = ?",
        userId,
        libraryTypeLiked
    );
    return results.map((r) => r.mediaId);
}

export async function getUserDownloadedMediaIds(
    userId: number
): Promise<number[]> {
    const db = getDb();
    const results = db.getAllSync<{ mediaId: number }>(
        "SELECT media_id FROM library_media WHERE user_id = ? AND library_type = ?",
        userId,
        libraryTypeDownloaded
    );
    return results.map((r) => r.mediaId);
}

export async function toggleLikeMedia(
    userId: number,
    mediaId: number
): Promise<boolean> {
    const isLiked = await isInLibrary(userId, mediaId, libraryTypeLiked);
    if (isLiked) {
        await removeFromLibrary(userId, mediaId, libraryTypeLiked);
        return false;
    } else {
        await addToLibrary(userId, mediaId, libraryTypeLiked);
        return true;
    }
}

export async function clearLibrary(
    userId: number,
    libraryType:
        | typeof libraryTypeLiked
        | typeof libraryTypeDownloaded
        | typeof libraryTypeRecent
): Promise<void> {
    const db = getDb();
    db.runSync(
        "DELETE FROM library_media WHERE user_id = ? AND library_type = ?",
        userId,
        libraryType
    );
}

export async function clearAllLibrary(userId: number): Promise<void> {
    const db = getDb();
    db.runSync("DELETE FROM library_media WHERE user_id = ?", userId);
}
