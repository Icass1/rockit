import { getDb } from "../db";
import {
    type MediaListened,
    type NewMediaListened,
    type NewStatsSummary,
    type NewStatsTopItem,
    type StatsSummary as StatsSummaryType,
    type StatsTopItem as StatsTopItemType,
} from "../schema";

const now = () => Math.floor(Date.now() / 1000);

export async function getStatsSummary(
    userId: number,
    range: string
): Promise<StatsSummaryType | null> {
    const db = getDb();
    const result = db.getFirstSync<StatsSummaryType>(
        "SELECT * FROM stats_summary WHERE user_id = ? AND range = ?",
        userId,
        range
    );
    return result ?? null;
}

export async function updateStatsSummary(
    summary: Omit<NewStatsSummary, "id" | "dateUpdated">
): Promise<void> {
    const db = getDb();
    const timestamp = now();
    const songsListened = summary.songsListened ?? 0;
    const minutesListened = summary.minutesListened ?? 0;
    const avgMinutesPerSong = summary.avgMinutesPerSong ?? 0;
    db.runSync(
        `INSERT INTO stats_summary (user_id, range, songs_listened, minutes_listened, avg_minutes_per_song, date_updated)
         VALUES (?, ?, ?, ?, ?, ?)
         ON CONFLICT(user_id, range) DO UPDATE SET
         songs_listened = excluded.songs_listened,
         minutes_listened = excluded.minutes_listened,
         avg_minutes_per_song = excluded.avg_minutes_per_song,
         date_updated = excluded.date_updated`,
        summary.userId,
        summary.range,
        songsListened,
        minutesListened,
        avgMinutesPerSong,
        timestamp
    );
}

export async function getStatsTopItems(
    userId: number,
    range: string,
    statsType: string
): Promise<StatsTopItemType[]> {
    const db = getDb();
    const results = db.getAllSync<StatsTopItemType>(
        "SELECT * FROM stats_top_item WHERE user_id = ? AND range = ? AND stats_type = ? ORDER BY position",
        userId,
        range,
        statsType
    );
    return results;
}

export async function updateStatsTopItems(
    items: Omit<NewStatsTopItem, "id" | "dateUpdated">[]
): Promise<void> {
    const db = getDb();
    const timestamp = now();

    db.execSync("BEGIN IMMEDIATE");
    try {
        for (const item of items) {
            db.runSync(
                `INSERT INTO stats_top_item (user_id, range, stats_type, media_public_id, name, image_url, value, position, date_updated)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                 ON CONFLICT(user_id, range, stats_type, media_public_id) DO UPDATE SET
                 name = excluded.name,
                 image_url = excluded.image_url,
                 value = excluded.value,
                 position = excluded.position,
                 date_updated = excluded.date_updated`,
                item.userId,
                item.range,
                item.statsType,
                item.mediaPublicId,
                item.name,
                item.imageUrl ?? null,
                item.value,
                item.position,
                timestamp
            );
        }
    } finally {
        db.execSync("COMMIT");
    }
}

export async function addMediaListened(
    listened: Omit<NewMediaListened, "id" | "synced">
): Promise<MediaListened> {
    const db = getDb();
    const result = db.runSync(
        `INSERT INTO media_listened (user_id, media_public_id, duration_ms, listened_at, synced)
         VALUES (?, ?, ?, ?, 0)`,
        listened.userId,
        listened.mediaPublicId,
        listened.durationMs,
        listened.listenedAt
    );
    return {
        ...listened,
        id: result.lastInsertRowId,
        synced: false,
    } as MediaListened;
}

export async function getUnsyncedMediaListened(
    userId: number
): Promise<MediaListened[]> {
    const db = getDb();
    const results = db.getAllSync<MediaListened>(
        "SELECT * FROM media_listened WHERE user_id = ? AND synced = 0 ORDER BY listened_at",
        userId
    );
    return results;
}

export async function markMediaListenedSynced(ids: number[]): Promise<void> {
    if (ids.length === 0) return;
    const db = getDb();
    const placeholders = ids.map(() => "?").join(", ");
    db.runSync(
        `UPDATE media_listened SET synced = 1 WHERE id IN (${placeholders})`,
        ids
    );
}

export async function hasListedToMedia(
    userId: number,
    mediaPublicId: string,
    durationMs: number,
    thresholdMs: number = 30000
): Promise<boolean> {
    const db = getDb();
    const result = db.getFirstSync<{ exists: number }>(
        "SELECT 1 as exists FROM media_listened WHERE user_id = ? AND media_public_id = ? AND duration_ms >= ? AND listened_at > ?",
        userId,
        mediaPublicId,
        durationMs,
        thresholdMs
    );
    return !!result;
}

export async function clearStats(userId: number): Promise<void> {
    const db = getDb();
    db.runSync("DELETE FROM stats_summary WHERE user_id = ?", userId);
    db.runSync("DELETE FROM stats_top_item WHERE user_id = ?", userId);
    db.runSync("DELETE FROM media_listened WHERE user_id = ?", userId);
}
