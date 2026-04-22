import { getDatabase } from "./localDB";
import { queueSyncOperation } from "./syncQueue";
import type { LocalSong, LocalAlbum, LocalPlaylist, LocalUser } from "./localTypes";
import type { BaseArtistResponse } from "@rockit/shared";

export async function saveSongs(songs: LocalSong[]): Promise<void> {
    const db = await getDatabase();
    const now = new Date().toISOString();

    for (const song of songs) {
        await db.runAsync(
            `INSERT OR REPLACE INTO songs 
            (public_id, provider, provider_url, name, artists_json, audio_src, downloaded, image_url, duration_ms, disc_number, track_number, album_json, last_sync)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                song.publicId,
                song.provider,
                song.providerUrl,
                song.name,
                JSON.stringify(song.artists),
                song.audioSrc,
                song.downloaded ? 1 : 0,
                song.imageUrl,
                song.duration_ms,
                song.discNumber,
                song.trackNumber,
                JSON.stringify(song.album),
                now,
            ]
        );
    }
}

export async function getSong(publicId: string): Promise<LocalSong | null> {
    const db = await getDatabase();
    const row = await db.getFirstAsync<{
        public_id: string;
        provider: string;
        provider_url: string;
        name: string;
        artists_json: string;
        audio_src: string | null;
        downloaded: number;
        image_url: string;
        duration_ms: number;
        disc_number: number;
        track_number: number;
        album_json: string;
    }>(`SELECT * FROM songs WHERE public_id = ?`, [publicId]);

    if (!row) return null;

    return {
        type: "song",
        provider: row.provider,
        publicId: row.public_id,
        providerUrl: row.provider_url,
        name: row.name,
        artists: JSON.parse(row.artists_json) as BaseArtistResponse[],
        audioSrc: row.audio_src,
        downloaded: row.downloaded === 1,
        imageUrl: row.image_url,
        duration_ms: row.duration_ms,
        discNumber: row.disc_number,
        trackNumber: row.track_number,
        album: JSON.parse(row.album_json) as LocalSong["album"],
    };
}

export async function getSongs(publicIds: string[]): Promise<LocalSong[]> {
    if (publicIds.length === 0) return [];

    const db = await getDatabase();
    const placeholders = publicIds.map(() => "?").join(",");
    const rows = await db.getAllAsync<{
        public_id: string;
        provider: string;
        provider_url: string;
        name: string;
        artists_json: string;
        audio_src: string | null;
        downloaded: number;
        image_url: string;
        duration_ms: number;
        disc_number: number;
        track_number: number;
        album_json: string;
    }>(`SELECT * FROM songs WHERE public_id IN (${placeholders})`, publicIds);

    return rows.map((row) => ({
        type: "song",
        provider: row.provider,
        publicId: row.public_id,
        providerUrl: row.provider_url,
        name: row.name,
        artists: JSON.parse(row.artists_json) as BaseArtistResponse[],
        audioSrc: row.audio_src,
        downloaded: row.downloaded === 1,
        imageUrl: row.image_url,
        duration_ms: row.duration_ms,
        discNumber: row.disc_number,
        trackNumber: row.track_number,
        album: JSON.parse(row.album_json) as LocalSong["album"],
    }));
}

export async function searchSongs(query: string): Promise<LocalSong[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<{
        public_id: string;
        provider: string;
        provider_url: string;
        name: string;
        artists_json: string;
        audio_src: string | null;
        downloaded: number;
        image_url: string;
        duration_ms: number;
        disc_number: number;
        track_number: number;
        album_json: string;
    }>(`SELECT * FROM songs WHERE name LIKE ? LIMIT 50`, [`%${query}%`]);

    return rows.map((row) => ({
        type: "song",
        provider: row.provider,
        publicId: row.public_id,
        providerUrl: row.provider_url,
        name: row.name,
        artists: JSON.parse(row.artists_json) as BaseArtistResponse[],
        audioSrc: row.audio_src,
        downloaded: row.downloaded === 1,
        imageUrl: row.image_url,
        duration_ms: row.duration_ms,
        discNumber: row.disc_number,
        trackNumber: row.track_number,
        album: JSON.parse(row.album_json) as LocalSong["album"],
    }));
}

export async function saveAlbums(albums: LocalAlbum[]): Promise<void> {
    const db = await getDatabase();
    const now = new Date().toISOString();

    for (const album of albums) {
        await db.runAsync(
            `INSERT OR REPLACE INTO albums 
            (public_id, provider, url, provider_url, name, artists_json, release_date, image_url, last_sync)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                album.publicId,
                album.provider,
                album.url,
                album.providerUrl,
                album.name,
                JSON.stringify(album.artists),
                album.releaseDate,
                album.imageUrl,
                now,
            ]
        );
    }
}

export async function getAlbum(publicId: string): Promise<LocalAlbum | null> {
    const db = await getDatabase();
    const row = await db.getFirstAsync<{
        public_id: string;
        provider: string;
        url: string;
        provider_url: string;
        name: string;
        artists_json: string;
        release_date: string;
        image_url: string;
    }>(`SELECT * FROM albums WHERE public_id = ?`, [publicId]);

    if (!row) return null;

    return {
        type: "album",
        provider: row.provider,
        publicId: row.public_id,
        url: row.url,
        providerUrl: row.provider_url,
        name: row.name,
        artists: JSON.parse(row.artists_json) as BaseArtistResponse[],
        releaseDate: row.release_date,
        imageUrl: row.image_url,
    };
}

export async function saveArtists(artists: BaseArtistResponse[]): Promise<void> {
    const db = await getDatabase();
    const now = new Date().toISOString();

    for (const artist of artists) {
        await db.runAsync(
            `INSERT OR REPLACE INTO artists 
            (public_id, provider, url, provider_url, name, image_url, last_sync)
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
                artist.publicId,
                artist.provider,
                artist.url,
                artist.providerUrl,
                artist.name,
                artist.imageUrl,
                now,
            ]
        );
    }
}

export async function getArtist(publicId: string): Promise<BaseArtistResponse | null> {
    const db = await getDatabase();
    const row = await db.getFirstAsync<{
        public_id: string;
        provider: string;
        url: string;
        provider_url: string;
        name: string;
        image_url: string;
    }>(`SELECT * FROM artists WHERE public_id = ?`, [publicId]);

    if (!row) return null;

    return {
        type: "artist",
        provider: row.provider,
        publicId: row.public_id,
        url: row.url,
        providerUrl: row.provider_url,
        name: row.name,
        imageUrl: row.image_url,
    };
}

export async function savePlaylists(
    playlists: LocalPlaylist[]
): Promise<void> {
    const db = await getDatabase();
    const now = new Date().toISOString();

    for (const playlist of playlists) {
        await db.runAsync(
            `INSERT OR REPLACE INTO playlists 
            (public_id, name, image_url, songs_json, is_shared, created_at, last_sync)
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
                playlist.publicId,
                playlist.name,
                playlist.imageUrl,
                JSON.stringify(playlist.songs),
                playlist.isShared ? 1 : 0,
                playlist.createdAt,
                now,
            ]
        );
    }
}

export async function getPlaylist(
    publicId: string
): Promise<LocalPlaylist | null> {
    const db = await getDatabase();
    const row = await db.getFirstAsync<{
        public_id: string;
        name: string;
        image_url: string | null;
        songs_json: string;
        is_shared: number;
        created_at: string;
    }>(`SELECT * FROM playlists WHERE public_id = ?`, [publicId]);

    if (!row) return null;

    return {
        type: "playlist",
        provider: "rockit",
        publicId: row.public_id,
        name: row.name,
        imageUrl: row.image_url,
        songs: JSON.parse(row.songs_json) as LocalSong[],
        isShared: row.is_shared === 1,
        createdAt: row.created_at,
    };
}

export async function getAllPlaylists(): Promise<LocalPlaylist[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<{
        public_id: string;
        name: string;
        image_url: string | null;
        songs_json: string;
        is_shared: number;
        created_at: string;
    }>(`SELECT * FROM playlists ORDER BY created_at DESC`);

    return rows.map((row) => ({
        type: "playlist",
        provider: "rockit",
        publicId: row.public_id,
        name: row.name,
        imageUrl: row.image_url,
        songs: JSON.parse(row.songs_json) as LocalSong[],
        isShared: row.is_shared === 1,
        createdAt: row.created_at,
    }));
}

export async function createPlaylistLocally(
    name: string,
    publicId: string
): Promise<void> {
    const db = await getDatabase();
    const now = new Date().toISOString();

    await db.runAsync(
        `INSERT INTO playlists (public_id, name, image_url, songs_json, is_shared, created_at, last_sync)
        VALUES (?, ?, ?, '[]', 0, ?, ?)`,
        [publicId, name, null, now, now]
    );

    await queueSyncOperation("create", "playlists", {
        public_id: publicId,
        name,
    });
}

export async function updatePlaylistLocally(
    publicId: string,
    name: string
): Promise<void> {
    const db = await getDatabase();
    const now = new Date().toISOString();

    await db.runAsync(`UPDATE playlists SET name = ?, last_sync = ? WHERE public_id = ?`, [
        name,
        now,
        publicId,
    ]);

    await queueSyncOperation("update", "playlists", {
        public_id: publicId,
        name,
    });
}

export async function deletePlaylistLocally(publicId: string): Promise<void> {
    const db = await getDatabase();
    await db.runAsync(`DELETE FROM playlists WHERE public_id = ?`, [publicId]);

    await queueSyncOperation("delete", "playlists", {
        public_id: publicId,
    });
}

export async function getLikedMediaPublicIds(): Promise<string[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<{ public_id: string }>(
        `SELECT public_id FROM liked_media`
    );
    return rows.map((row) => row.public_id);
}

export async function getLikedMedia(): Promise<{ publicId: string; mediaType: string }[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<{
        public_id: string;
        media_type: string;
    }>(`SELECT public_id, media_type FROM liked_media`);
    return rows.map((row) => ({
        publicId: row.public_id,
        mediaType: row.media_type,
    }));
}

export async function likeMediaLocally(
    publicId: string,
    mediaType: string
): Promise<void> {
    const db = await getDatabase();
    const now = new Date().toISOString();

    await db.runAsync(
        `INSERT OR IGNORE INTO liked_media (public_id, media_type, created_at, last_sync)
        VALUES (?, ?, ?, ?)`,
        [publicId, mediaType, now, now]
    );

    await queueSyncOperation("create", "liked_media", {
        public_id: publicId,
        media_type: mediaType,
    });
}

export async function unlikeMediaLocally(publicId: string): Promise<void> {
    const db = await getDatabase();
    await db.runAsync(`DELETE FROM liked_media WHERE public_id = ?`, [publicId]);

    await queueSyncOperation("delete", "liked_media", {
        public_id: publicId,
    });
}

export async function saveUser(
    user: LocalUser,
    isLoggedIn: boolean
): Promise<void> {
    const db = await getDatabase();
    const now = new Date().toISOString();

    if (isLoggedIn) {
        await db.runAsync(
            `INSERT OR REPLACE INTO user (id, username, lang, crossfade, random_queue, repeat_mode, last_sync)
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
                user.id,
                user.username,
                user.lang,
                user.crossfade,
                user.randomQueue ? 1 : 0,
                user.repeatMode,
                now,
            ]
        );
    } else {
        await db.runAsync(`DELETE FROM user`);
    }
}

export async function getUser(): Promise<LocalUser | null> {
    const db = await getDatabase();
    const row = await db.getFirstAsync<{
        id: number;
        username: string;
        lang: string;
        crossfade: number;
        random_queue: number;
        repeat_mode: string;
    }>(`SELECT * FROM user LIMIT 1`);

    if (!row) return null;

    return {
        id: row.id,
        username: row.username,
        lang: row.lang,
        crossfade: row.crossfade,
        randomQueue: row.random_queue === 1,
        repeatMode: row.repeat_mode,
    };
}

export async function updateUserSettings(
    lang: string,
    crossfade: number,
    randomQueue: boolean,
    repeatMode: string
): Promise<void> {
    const db = await getDatabase();
    const now = new Date().toISOString();

    await db.runAsync(
        `UPDATE user SET lang = ?, crossfade = ?, random_queue = ?, repeat_mode = ?, last_sync = ?`,
        [lang, crossfade, randomQueue ? 1 : 0, repeatMode, now]
    );

    await queueSyncOperation("update", "user_settings", {
        lang,
        crossfade,
        random_queue: randomQueue,
        repeat_mode: repeatMode,
    });
}

export async function getLastSyncTimestamp(tableName: string): Promise<string | null> {
    const db = await getDatabase();
    const row = await db.getFirstAsync<{ timestamp: string }>(
        `SELECT timestamp FROM last_sync WHERE table_name = ?`,
        [tableName]
    );
    return row?.timestamp ?? null;
}

export async function setLastSyncTimestamp(tableName: string): Promise<void> {
    const db = await getDatabase();
    const now = new Date().toISOString();
    await db.runAsync(
        `INSERT OR REPLACE INTO last_sync (table_name, timestamp) VALUES (?, ?)`,
        [tableName, now]
    );
}