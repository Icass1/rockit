import { getDatabase } from "./localDB";

export interface SyncQueueItem {
    id: number;
    operation: "create" | "update" | "delete";
    tableName: string;
    data: Record<string, unknown>;
    createdAt: string;
    synced: boolean;
}

export async function queueSyncOperation(
    operation: "create" | "update" | "delete",
    tableName: string,
    data: Record<string, unknown>
): Promise<void> {
    const db = await getDatabase();
    const createdAt = new Date().toISOString();

    await db.runAsync(
        `INSERT INTO sync_queue (operation, table_name, data_json, created_at, synced) VALUES (?, ?, ?, ?, 0)`,
        [operation, tableName, JSON.stringify(data), createdAt]
    );
}

export async function getPendingSyncOperations(): Promise<SyncQueueItem[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<{
        id: number;
        operation: string;
        table_name: string;
        data_json: string;
        created_at: string;
        synced: number;
    }>(`SELECT * FROM sync_queue WHERE synced = 0 ORDER BY created_at ASC`);

    return rows.map((row) => ({
        id: row.id,
        operation: row.operation as "create" | "update" | "delete",
        tableName: row.table_name,
        data: JSON.parse(row.data_json),
        createdAt: row.created_at,
        synced: row.synced === 1,
    }));
}

export async function markSynced(ids: number[]): Promise<void> {
    if (ids.length === 0) return;

    const db = await getDatabase();
    const placeholders = ids.map(() => "?").join(",");
    await db.runAsync(
        `UPDATE sync_queue SET synced = 1 WHERE id IN (${placeholders})`,
        ids
    );
}

export async function clearSyncQueue(): Promise<void> {
    const db = await getDatabase();
    await db.runAsync(`DELETE FROM sync_queue WHERE synced = 1`);
}

export async function getQueueCount(): Promise<number> {
    const db = await getDatabase();
    const result = await db.getFirstAsync<{ count: number }>(
        `SELECT COUNT(*) as count FROM sync_queue WHERE synced = 0`
    );
    return result?.count ?? 0;
}