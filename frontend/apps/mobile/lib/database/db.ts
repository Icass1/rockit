import { openDatabaseSync, SQLiteDatabase } from "expo-sqlite";

let db: SQLiteDatabase | null = null;

export function getDb(): SQLiteDatabase {
    console.log("[getDb] 1", db);
    if (!db) {
        db = openDatabaseSync("rockit.db");
    }

    console.log("[getDb] 2", db);

    return db;
}

export async function initDatabase(): Promise<void> {
    console.log("Initializing database...");
    const database = getDb();

    database.execSync(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            public_id TEXT UNIQUE NOT NULL,
            username TEXT UNIQUE NOT NULL,
            password_hash TEXT,
            provider TEXT,
            provider_account_id TEXT,
            current_station TEXT,
            current_time_ms INTEGER,
            current_queue_media_id INTEGER,
            queue_type_key INTEGER NOT NULL DEFAULT 2,
            repeat_mode_key INTEGER NOT NULL DEFAULT 1,
            volume REAL NOT NULL DEFAULT 1,
            cross_fade_ms INTEGER NOT NULL DEFAULT 0,
            lang_id INTEGER NOT NULL DEFAULT 1,
            admin INTEGER NOT NULL DEFAULT 0,
            super_admin INTEGER NOT NULL DEFAULT 0,
            image_id INTEGER,
            date_updated INTEGER,
            date_added INTEGER
        );
    `);

    database.execSync(`
        CREATE TABLE IF NOT EXISTS media (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            public_id TEXT UNIQUE NOT NULL,
            provider_id INTEGER NOT NULL,
            provider TEXT NOT NULL,
            media_type_key INTEGER NOT NULL,
            media_type TEXT NOT NULL,
            name TEXT NOT NULL,
            url TEXT,
            provider_url TEXT,
            image_url TEXT,
            duration_ms INTEGER,
            audio_src TEXT,
            video_src TEXT,
            artists TEXT,
            album_public_id TEXT,
            album_name TEXT,
            release_date TEXT,
            disc_number INTEGER,
            track_number INTEGER,
            downloaded INTEGER NOT NULL DEFAULT 0,
            local_file_path TEXT,
            date_updated INTEGER,
            date_added INTEGER
        );
    `);

    database.execSync(`
        CREATE TABLE IF NOT EXISTS library_media (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            media_id INTEGER NOT NULL,
            library_type TEXT NOT NULL,
            date_added INTEGER,
            UNIQUE(user_id, media_id, library_type)
        );
    `);

    database.execSync(`
        CREATE TABLE IF NOT EXISTS playlists (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            public_id TEXT UNIQUE NOT NULL,
            user_id INTEGER NOT NULL,
            name TEXT NOT NULL,
            description TEXT,
            image_url TEXT,
            owner TEXT NOT NULL,
            provider TEXT NOT NULL,
            is_public INTEGER NOT NULL DEFAULT 0,
            date_updated INTEGER,
            date_added INTEGER
        );
    `);

    database.execSync(`
        CREATE TABLE IF NOT EXISTS playlist_media (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            playlist_id INTEGER NOT NULL,
            media_id INTEGER NOT NULL,
            position INTEGER NOT NULL,
            date_added INTEGER,
            UNIQUE(playlist_id, media_id)
        );
    `);

    database.execSync(`
        CREATE TABLE IF NOT EXISTS queue (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            media_id INTEGER NOT NULL,
            media_public_id TEXT NOT NULL,
            queue_media_id INTEGER NOT NULL,
            queue_type TEXT NOT NULL DEFAULT 'normal',
            position INTEGER NOT NULL,
            date_added INTEGER
        );
    `);

    database.execSync(`
        CREATE TABLE IF NOT EXISTS stats_summary (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            range TEXT NOT NULL,
            songs_listened INTEGER NOT NULL DEFAULT 0,
            minutes_listened REAL NOT NULL DEFAULT 0,
            avg_minutes_per_song REAL NOT NULL DEFAULT 0,
            date_updated INTEGER,
            UNIQUE(user_id, range)
        );
    `);

    database.execSync(`
        CREATE TABLE IF NOT EXISTS stats_top_item (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            range TEXT NOT NULL,
            stats_type TEXT NOT NULL,
            media_public_id TEXT NOT NULL,
            name TEXT NOT NULL,
            image_url TEXT,
            value INTEGER NOT NULL,
            position INTEGER NOT NULL,
            date_updated INTEGER
        );
    `);

    database.execSync(`
        CREATE TABLE IF NOT EXISTS media_listened (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            media_public_id TEXT NOT NULL,
            duration_ms INTEGER NOT NULL,
            listened_at INTEGER NOT NULL,
            synced INTEGER NOT NULL DEFAULT 0
        );
    `);

    database.execSync(`
        CREATE TABLE IF NOT EXISTS vocabulary (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            lang_id INTEGER NOT NULL,
            key TEXT NOT NULL,
            value TEXT NOT NULL,
            UNIQUE(lang_id, key)
        );
    `);

    database.execSync(`
        CREATE TABLE IF NOT EXISTS pending_messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            type TEXT NOT NULL,
            payload TEXT NOT NULL,
            timestamp_ms INTEGER NOT NULL,
            created_at INTEGER NOT NULL,
            synced INTEGER NOT NULL DEFAULT 0
        );
    `);

    database.execSync(`
        CREATE TABLE IF NOT EXISTS sessions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            public_id TEXT UNIQUE NOT NULL,
            user_id INTEGER NOT NULL,
            expires_at INTEGER NOT NULL,
            date_added INTEGER
        );
    `);

    database.execSync(`
        CREATE TABLE IF NOT EXISTS artists (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            public_id TEXT UNIQUE NOT NULL,
            name TEXT NOT NULL,
            image_url TEXT,
            local_image_path TEXT,
            provider TEXT,
            url TEXT,
            provider_url TEXT,
            date_updated INTEGER,
            date_added INTEGER
        );
    `);

    // Migrations for columns added after initial schema
    try {
        database.execSync(`ALTER TABLE media ADD COLUMN local_image_path TEXT`);
    } catch {
        // Column already exists
    }

    database.execSync(`
        CREATE TABLE IF NOT EXISTS downloads (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            public_id TEXT UNIQUE NOT NULL,
            group_id TEXT NOT NULL,
            user_id INTEGER NOT NULL,
            media_public_id TEXT NOT NULL,
            title TEXT,
            subtitle TEXT,
            image_url TEXT,
            status TEXT NOT NULL,
            progress INTEGER NOT NULL DEFAULT 0,
            message TEXT,
            date_added INTEGER,
            date_updated INTEGER
        );
    `);

    console.log("Database initialized!");
}
