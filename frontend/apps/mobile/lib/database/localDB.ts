import * as SQLite from "expo-sqlite";

const DB_NAME = "rockit.db";

let db: SQLite.SQLiteDatabase | null = null;

export async function initDatabase(): Promise<SQLite.SQLiteDatabase> {
    if (db) return db;

    db = await SQLite.openDatabaseAsync(DB_NAME);
    await db.execAsync(`
        PRAGMA journal_mode = WAL;
        PRAGMA synchronous = NORMAL;

        CREATE TABLE IF NOT EXISTS user (
            id INTEGER PRIMARY KEY NOT NULL,
            username TEXT NOT NULL,
            lang TEXT DEFAULT 'en',
            crossfade INTEGER DEFAULT 0,
            random_queue INTEGER DEFAULT 0,
            repeat_mode TEXT DEFAULT 'none',
            last_sync TEXT
        );

        CREATE TABLE IF NOT EXISTS songs (
            public_id TEXT PRIMARY KEY NOT NULL,
            provider TEXT NOT NULL,
            provider_url TEXT,
            name TEXT NOT NULL,
            artists_json TEXT NOT NULL,
            audio_src TEXT,
            downloaded INTEGER DEFAULT 0,
            image_url TEXT NOT NULL,
            duration_ms INTEGER NOT NULL,
            disc_number INTEGER DEFAULT 1,
            track_number INTEGER DEFAULT 1,
            album_json TEXT NOT NULL,
            last_sync TEXT
        );

        CREATE TABLE IF NOT EXISTS albums (
            public_id TEXT PRIMARY KEY NOT NULL,
            provider TEXT NOT NULL,
            url TEXT,
            provider_url TEXT,
            name TEXT NOT NULL,
            artists_json TEXT NOT NULL,
            release_date TEXT,
            image_url TEXT NOT NULL,
            last_sync TEXT
        );

        CREATE TABLE IF NOT EXISTS artists (
            public_id TEXT PRIMARY KEY NOT NULL,
            provider TEXT NOT NULL,
            url TEXT,
            provider_url TEXT,
            name TEXT NOT NULL,
            image_url TEXT NOT NULL,
            last_sync TEXT
        );

        CREATE TABLE IF NOT EXISTS playlists (
            public_id TEXT PRIMARY KEY NOT NULL,
            name TEXT NOT NULL,
            image_url TEXT,
            songs_json TEXT DEFAULT '[]',
            is_shared INTEGER DEFAULT 0,
            created_at TEXT,
            last_sync TEXT
        );

        CREATE TABLE IF NOT EXISTS liked_media (
            public_id TEXT PRIMARY KEY NOT NULL,
            media_type TEXT NOT NULL,
            created_at TEXT,
            last_sync TEXT
        );

        CREATE TABLE IF NOT EXISTS sync_queue (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            operation TEXT NOT NULL,
            table_name TEXT NOT NULL,
            data_json TEXT NOT NULL,
            created_at TEXT NOT NULL,
            synced INTEGER DEFAULT 0
        );

        CREATE TABLE IF NOT EXISTS last_sync (
            table_name TEXT PRIMARY KEY,
            timestamp TEXT NOT NULL
        );
    `);

    return db;
}

export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
    if (!db) {
        return initDatabase();
    }
    return db;
}

export async function closeDatabase(): Promise<void> {
    if (db) {
        await db.closeAsync();
        db = null;
    }
}