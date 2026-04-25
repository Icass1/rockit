import { getDb } from "../db";
import { type PendingMessage } from "../schema";

const now = () => Math.floor(Date.now() / 1000);

export type PendingMessageType =
    | "media_ended"
    | "media_clicked"
    | "current_media"
    | "current_queue"
    | "current_time"
    | "seek"
    | "skip";

export async function addPendingMessage(
    type: PendingMessageType,
    payload: object
): Promise<PendingMessage> {
    const db = getDb();
    const timestamp = now();
    const timestampMs = Date.now();

    const result = db.runSync(
        `INSERT INTO pending_messages (type, payload, timestamp_ms, created_at, synced)
         VALUES (?, ?, ?, ?, 0)`,
        type,
        JSON.stringify(payload),
        timestampMs,
        timestamp
    );
    return {
        id: result.lastInsertRowId,
        type,
        payload: JSON.stringify(payload),
        timestampMs,
        createdAt: timestamp,
        synced: false,
    };
}

export async function getUnsyncedMessages(): Promise<PendingMessage[]> {
    const db = getDb();
    const results = db.getAllSync<PendingMessage>(
        "SELECT * FROM pending_messages WHERE synced = 0 ORDER BY timestamp_ms ASC"
    );
    return results;
}

export async function getUnsyncedMessagesByType(
    type: PendingMessageType
): Promise<PendingMessage[]> {
    const db = getDb();
    const results = db.getAllSync<PendingMessage>(
        "SELECT * FROM pending_messages WHERE type = ? AND synced = 0 ORDER BY timestamp_ms ASC",
        type
    );
    return results;
}

export async function markMessagesSynced(ids: number[]): Promise<void> {
    if (ids.length === 0) return;
    const db = getDb();
    const placeholders = ids.map(() => "?").join(", ");
    db.runSync(
        `UPDATE pending_messages SET synced = 1 WHERE id IN (${placeholders})`,
        ids
    );
}

export async function clearSyncedMessages(
    beforeTimestamp: number
): Promise<void> {
    const db = getDb();
    db.runSync(
        "DELETE FROM pending_messages WHERE synced = 1 AND created_at < ?",
        beforeTimestamp
    );
}

export async function clearAllPendingMessages(): Promise<void> {
    const db = getDb();
    db.runSync("DELETE FROM pending_messages");
}

export async function getPendingMessageCount(): Promise<number> {
    const db = getDb();
    const result = db.getFirstSync<{ count: number }>(
        "SELECT COUNT(*) as count FROM pending_messages WHERE synced = 0"
    );
    return result?.count ?? 0;
}

export async function hasPendingMessages(): Promise<boolean> {
    const count = await getPendingMessageCount();
    return count > 0;
}

export async function getPendingMessageCountByType(
    type: PendingMessageType
): Promise<number> {
    const db = getDb();
    const result = db.getFirstSync<{ count: number }>(
        "SELECT COUNT(*) as count FROM pending_messages WHERE type = ? AND synced = 0",
        type
    );
    return result?.count ?? 0;
}
