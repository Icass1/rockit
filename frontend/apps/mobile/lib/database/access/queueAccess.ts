import { getDb } from "../db";
import { type NewQueue, type Queue } from "../schema";

const now = () => Math.floor(Date.now() / 1000);

export async function getUserQueue(
    userId: number,
    queueType: string = "normal"
): Promise<Queue[]> {
    const db = getDb();
    const qType = queueType ?? "normal";
    const results = db.getAllSync<Queue>(
        "SELECT * FROM queue WHERE user_id = ? AND queue_type = ? ORDER BY position",
        userId,
        qType
    );
    return results;
}

export async function getUserQueueWithLock(
    userId: number,
    queueType: string = "normal"
): Promise<Queue[]> {
    const db = getDb();
    db.execSync("BEGIN IMMEDIATE");
    try {
        const results = db.getAllSync<Queue>(
            "SELECT * FROM queue WHERE user_id = ? AND queue_type = ? ORDER BY position FOR UPDATE",
            userId,
            queueType
        );
        return results;
    } finally {
        db.execSync("COMMIT");
    }
}

export async function addToQueue(
    queueItem: Omit<NewQueue, "id" | "dateAdded">
): Promise<Queue> {
    const db = getDb();
    const timestamp = now();
    const qType = queueItem.queueType ?? "normal";

    const maxPosResult = db.getFirstSync<{ maxPos: number }>(
        "SELECT MAX(position) as maxPos FROM queue WHERE user_id = ? AND queue_type = ?",
        queueItem.userId,
        qType
    );
    const position = (maxPosResult?.maxPos ?? -1) + 1;

    const result = db.runSync(
        `INSERT INTO queue (user_id, media_id, media_public_id, queue_media_id, queue_type, position, date_added)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        queueItem.userId,
        queueItem.mediaId,
        queueItem.mediaPublicId,
        queueItem.queueMediaId,
        qType,
        position,
        timestamp
    );
    return {
        ...queueItem,
        id: result.lastInsertRowId,
        dateAdded: timestamp,
    } as Queue;
}

export async function removeFromQueue(
    userId: number,
    mediaPublicId: string,
    queueType: string = "normal"
): Promise<void> {
    const db = getDb();
    db.runSync(
        "DELETE FROM queue WHERE user_id = ? AND media_public_id = ? AND queue_type = ?",
        userId,
        mediaPublicId,
        queueType
    );
}

export async function clearQueue(
    userId: number,
    queueType: string = "normal"
): Promise<void> {
    const db = getDb();
    db.runSync(
        "DELETE FROM queue WHERE user_id = ? AND queue_type = ?",
        userId,
        queueType
    );
}

export async function reorderQueue(
    userId: number,
    mediaPublicIds: string[],
    queueType: string = "normal"
): Promise<void> {
    const db = getDb();
    db.execSync("BEGIN IMMEDIATE");
    try {
        mediaPublicIds.forEach((publicId, index) => {
            db.runSync(
                "UPDATE queue SET position = ? WHERE user_id = ? AND media_public_id = ? AND queue_type = ?",
                index,
                userId,
                publicId,
                queueType
            );
        });
    } finally {
        db.execSync("COMMIT");
    }
}

export async function addMediaNextToQueue(
    queueItem: Omit<NewQueue, "id" | "dateAdded">
): Promise<Queue> {
    const db = getDb();
    const timestamp = now();
    const qType = queueItem.queueType ?? "normal";

    const topResult = db.getFirstSync<{ minPos: number }>(
        "SELECT MIN(position) as minPos FROM queue WHERE user_id = ? AND queue_type = ?",
        queueItem.userId,
        qType
    );
    const position = (topResult?.minPos ?? 0) - 1;

    const result = db.runSync(
        `INSERT INTO queue (user_id, media_id, media_public_id, queue_media_id, queue_type, position, date_added)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        queueItem.userId,
        queueItem.mediaId,
        queueItem.mediaPublicId,
        queueItem.queueMediaId,
        qType,
        position,
        timestamp
    );
    return {
        ...queueItem,
        id: result.lastInsertRowId,
        dateAdded: timestamp,
    } as Queue;
}

export async function getQueuePosition(
    userId: number,
    mediaPublicId: string,
    queueType: string = "normal"
): Promise<number> {
    const db = getDb();
    const result = db.getFirstSync<{ position: number }>(
        "SELECT position FROM queue WHERE user_id = ? AND media_public_id = ? AND queue_type = ?",
        userId,
        mediaPublicId,
        queueType
    );
    return result?.position ?? -1;
}

export async function getNextInQueue(
    userId: number,
    queueType: string = "normal"
): Promise<Queue | null> {
    const db = getDb();
    const result = db.getFirstSync<Queue>(
        "SELECT * FROM queue WHERE user_id = ? AND queue_type = ? ORDER BY position ASC LIMIT 1",
        userId,
        queueType
    );
    return result ?? null;
}

export async function getPreviousInQueue(
    userId: number,
    queueType: string = "normal"
): Promise<Queue | null> {
    const db = getDb();
    const result = db.getFirstSync<Queue>(
        "SELECT * FROM queue WHERE user_id = ? AND queue_type = ? ORDER BY position DESC LIMIT 1",
        userId,
        queueType
    );
    return result ?? null;
}

export async function getQueueCount(
    userId: number,
    queueType: string = "normal"
): Promise<number> {
    const db = getDb();
    const result = db.getFirstSync<{ count: number }>(
        "SELECT COUNT(*) as count FROM queue WHERE user_id = ? AND queue_type = ?",
        userId,
        queueType
    );
    return result?.count ?? 0;
}
