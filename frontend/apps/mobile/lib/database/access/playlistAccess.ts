import { getDb } from "../db";
import { type NewPlaylist, type Playlist } from "../schema";

const now = () => Math.floor(Date.now() / 1000);

export async function getPlaylistById(
    playlistId: number
): Promise<Playlist | null> {
    const db = getDb();
    const result = db.getFirstSync<Playlist>(
        "SELECT * FROM playlists WHERE id = ?",
        playlistId
    );
    return result ?? null;
}

export async function getPlaylistByPublicId(
    publicId: string
): Promise<Playlist | null> {
    const db = getDb();
    const result = db.getFirstSync<Playlist>(
        "SELECT * FROM playlists WHERE public_id = ?",
        publicId
    );
    return result ?? null;
}

export async function getPlaylistsByUser(userId: number): Promise<Playlist[]> {
    const db = getDb();
    const results = db.getAllSync<Playlist>(
        "SELECT * FROM playlists WHERE user_id = ? ORDER BY date_added DESC",
        userId
    );
    return results;
}

export async function createPlaylist(
    playlist: Omit<NewPlaylist, "id" | "dateUpdated" | "dateAdded">
): Promise<Playlist> {
    const existingPlaylist = await getPlaylistByPublicId(playlist.publicId);
    if (existingPlaylist) {
        return existingPlaylist;
    }

    const db = getDb();
    const timestamp = now();
    const result = db.runSync(
        `INSERT INTO playlists (public_id, user_id, name, description, image_url, owner, provider, is_public, date_updated, date_added)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        playlist.publicId ?? null,
        playlist.userId ?? null,
        playlist.name ?? null,
        playlist.description ?? null,
        playlist.imageUrl ?? null,
        playlist.owner ?? null,
        playlist.provider ?? null,
        playlist.isPublic ? 1 : 0,
        timestamp,
        timestamp
    );
    return {
        ...playlist,
        id: result.lastInsertRowId,
        dateUpdated: timestamp,
        dateAdded: timestamp,
    } as Playlist;
}

export async function updatePlaylist(
    playlistId: number,
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
    if (updates.description !== undefined) {
        fields.push("description = ?");
        values.push(updates.description);
    }
    if (updates.imageUrl !== undefined) {
        fields.push("image_url = ?");
        values.push(updates.imageUrl);
    }
    if (updates.owner !== undefined) {
        fields.push("owner = ?");
        values.push(updates.owner);
    }
    if (updates.provider !== undefined) {
        fields.push("provider = ?");
        values.push(updates.provider);
    }
    if (updates.isPublic !== undefined) {
        fields.push("is_public = ?");
        values.push(updates.isPublic ? 1 : 0);
    }

    values.push(playlistId);
    db.runSync(
        `UPDATE playlists SET ${fields.join(", ")} WHERE id = ?`,
        values
    );
}

export async function deletePlaylist(playlistId: number): Promise<void> {
    const db = getDb();
    db.runSync("DELETE FROM playlist_media WHERE playlist_id = ?", playlistId);
    db.runSync("DELETE FROM playlists WHERE id = ?", playlistId);
}

export async function addMediaToPlaylist(
    playlistId: number,
    mediaId: number
): Promise<void> {
    const db = getDb();
    const timestamp = now();

    const maxPosResult = db.getFirstSync<{ maxPos: number }>(
        "SELECT MAX(position) as maxPos FROM playlist_media WHERE playlist_id = ?",
        playlistId
    );
    const position = (maxPosResult?.maxPos ?? -1) + 1;

    db.runSync(
        `INSERT OR IGNORE INTO playlist_media (playlist_id, media_id, position, date_added)
         VALUES (?, ?, ?, ?)`,
        playlistId,
        mediaId,
        position,
        timestamp
    );
}

export async function removeMediaFromPlaylist(
    playlistId: number,
    mediaId: number
): Promise<void> {
    const db = getDb();
    db.runSync(
        "DELETE FROM playlist_media WHERE playlist_id = ? AND media_id = ?",
        playlistId,
        mediaId
    );
}

export async function getPlaylistMediaIds(
    playlistId: number
): Promise<number[]> {
    const db = getDb();
    const results = db.getAllSync<{ mediaId: number }>(
        "SELECT media_id FROM playlist_media WHERE playlist_id = ? ORDER BY position",
        playlistId
    );
    return results.map((r) => r.mediaId);
}

export async function reorderPlaylistMedia(
    playlistId: number,
    mediaIds: number[]
): Promise<void> {
    const db = getDb();
    db.execSync("BEGIN IMMEDIATE");
    try {
        mediaIds.forEach((mediaId, index) => {
            db.runSync(
                "UPDATE playlist_media SET position = ? WHERE playlist_id = ? AND media_id = ?",
                index,
                playlistId,
                mediaId
            );
        });
    } finally {
        db.execSync("COMMIT");
    }
}
