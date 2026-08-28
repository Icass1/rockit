import type {
    LibraryMediasResponse,
    SessionResponse,
    VocabularyResponse,
} from "@/dto";
import { openDB, type DBSchema, type IDBPDatabase } from "idb";

export interface OfflineSongRecord {
    publicId: string;
    audioBlob: Blob;
    coverBlob: Blob | null;
    downloadedAt: number;
    sizeBytes: number;
    /**
     * publicIds of library albums that contain this song. Settled when the
     * song is saved offline. Optional so records written before this field
     * existed migrate gracefully (treated as "no known album").
     */
    parentAlbumIds?: string[];
    /**
     * publicIds of playlists that contain this song. Populated from the
     * immediate context (`listPublicId`) at save time and kept in sync when
     * the song is added to / removed from playlists. Not exhaustive.
     */
    parentPlaylistIds?: string[];
}

interface RockItOfflineDB extends DBSchema {
    songs: {
        key: string;
        value: OfflineSongRecord;
    };
    session: {
        key: string;
        value: { data: SessionResponse; savedAt: number };
    };
    vocabulary: {
        key: string;
        value: { data: VocabularyResponse; savedAt: number };
    };
    library: {
        key: string;
        value: { data: LibraryMediasResponse; savedAt: number };
    };
}

const DB_NAME = "rockit-offline-media";
const DB_VERSION = 3;
let dbPromise: Promise<IDBPDatabase<RockItOfflineDB>> | null = null;

function getDB(): Promise<IDBPDatabase<RockItOfflineDB>> {
    if (!dbPromise) {
        dbPromise = openDB<RockItOfflineDB>(DB_NAME, DB_VERSION, {
            upgrade(db) {
                if (!db.objectStoreNames.contains("songs")) {
                    db.createObjectStore("songs", { keyPath: "publicId" });
                }
                if (!db.objectStoreNames.contains("session")) {
                    db.createObjectStore("session");
                }
                if (!db.objectStoreNames.contains("vocabulary")) {
                    db.createObjectStore("vocabulary");
                }
                if (!db.objectStoreNames.contains("library")) {
                    db.createObjectStore("library");
                }
            },
        });
    }
    return dbPromise;
}

export async function saveSongOffline(
    publicId: string,
    audioUrl: string,
    coverUrl: string | null,
    parentAlbumIds: string[] = [],
    parentPlaylistIds: string[] = []
): Promise<void> {
    const audioRes = await fetch(audioUrl);
    if (!audioRes.ok)
        throw new Error(`Fallo al descargar audio de ${publicId}`);
    const audioBlob = await audioRes.blob();

    let coverBlob: Blob | null = null;
    if (coverUrl) {
        try {
            const proxyUrl = `/_next/image?url=${encodeURIComponent(coverUrl)}&w=384&q=75`;
            const coverRes = await fetch(proxyUrl);
            if (coverRes.ok) coverBlob = await coverRes.blob();
        } catch {
            // La portada es "nice to have" -- si falla, seguimos sin ella,
            // NO abortamos la descarga de la canción por esto.
        }
    }

    const db = await getDB();
    try {
        // Merge with the existing record (if any) so that parent references
        // accumulated via addSongPlaylistRef() / updateOfflineSongPlaylist()
        // survive a re-download of an already-offline song. Without this, a
        // re-save would silently drop every playlist relationship collected
        // over time.
        const existing = await db.get("songs", publicId);
        const mergedAlbumIds = Array.from(
            new Set([...(existing?.parentAlbumIds ?? []), ...parentAlbumIds])
        );
        const mergedPlaylistIds = Array.from(
            new Set([
                ...(existing?.parentPlaylistIds ?? []),
                ...parentPlaylistIds,
            ])
        );

        await db.put("songs", {
            publicId,
            audioBlob,
            coverBlob,
            downloadedAt: Date.now(),
            sizeBytes: audioBlob.size + (coverBlob?.size ?? 0),
            parentAlbumIds: mergedAlbumIds,
            parentPlaylistIds: mergedPlaylistIds,
        });
    } catch (err) {
        if (err instanceof DOMException && err.name === "QuotaExceededError") {
            throw new Error("STORAGE_FULL");
        }
        throw err;
    }
}

export async function getOfflineSong(
    publicId: string
): Promise<OfflineSongRecord | undefined> {
    const db = await getDB();
    return db.get("songs", publicId);
}

export async function listOfflineSongRecords(): Promise<OfflineSongRecord[]> {
    const db = await getDB();
    return db.getAll("songs");
}

/**
 * In-sync helper used when a song is added to / removed from a playlist while
 * already saved offline. Reads the existing record (blobs included) and
 * updates only the parent-playlist references, so the relationship stays
 * accurate without a full re-download. No-op if the song isn't offline.
 */
export async function updateOfflineSongPlaylist(
    publicId: string,
    playlistPublicId: string,
    add: boolean
): Promise<void> {
    const db = await getDB();
    const record = await db.get("songs", publicId);
    if (!record) return;

    const current = record.parentPlaylistIds ?? [];
    const next = add
        ? current.includes(playlistPublicId)
            ? current
            : [...current, playlistPublicId]
        : current.filter((id) => id !== playlistPublicId);

    await db.put("songs", { ...record, parentPlaylistIds: next });
}

/**
 * Remove parent references (album and/or playlist ids) from an offline song's
 * record without touching the blobs, so media can be dropped from an album /
 * playlist grouping while staying available if still referenced elsewhere.
 * Returns true when the song is left with NO parent references at all, which
 * signals it can be fully removed from the device. No-op if not offline.
 */
export async function pruneOfflineSongParents(
    publicId: string,
    removeAlbumIds: string[],
    removePlaylistIds: string[]
): Promise<boolean> {
    const db = await getDB();
    const record = await db.get("songs", publicId);
    if (!record) return false;

    const albumIds = (record.parentAlbumIds ?? []).filter(
        (id) => !removeAlbumIds.includes(id)
    );
    const playlistIds = (record.parentPlaylistIds ?? []).filter(
        (id) => !removePlaylistIds.includes(id)
    );

    await db.put("songs", {
        ...record,
        parentAlbumIds: albumIds,
        parentPlaylistIds: playlistIds,
    });

    return albumIds.length === 0 && playlistIds.length === 0;
}

export async function deleteOfflineSong(publicId: string): Promise<void> {
    const db = await getDB();
    await db.delete("songs", publicId);
}

export async function listOfflineSongIds(): Promise<string[]> {
    const db = await getDB();
    return db.getAllKeys("songs");
}

export async function getOfflineStorageBytes(): Promise<number> {
    const db = await getDB();
    const all = await db.getAll("songs");
    return all.reduce((sum, s) => sum + s.sizeBytes, 0);
}

const OFFLINE_CACHE_KEY = "current";

export async function saveSessionOffline(
    session: SessionResponse
): Promise<void> {
    const db = await getDB();
    await db.put(
        "session",
        { data: session, savedAt: Date.now() },
        OFFLINE_CACHE_KEY
    );
}

export async function loadSessionOffline(): Promise<SessionResponse | null> {
    const db = await getDB();
    const record = await db.get("session", OFFLINE_CACHE_KEY);
    return record?.data ?? null;
}

export async function clearSessionOffline(): Promise<void> {
    const db = await getDB();
    await db.delete("session", OFFLINE_CACHE_KEY);

    // Service worker caches hold user-scoped API data keyed by URL only.
    // Purge them on auth transitions so another account on this device
    // can never be served the previous account's session, lists or
    // private playlists. Audio and images are global content and stay.
    if (typeof caches === "undefined") return;

    await Promise.all(
        ["rockit-session", "rockit-lists", "rockit-details"].map((cacheName) =>
            caches.delete(cacheName)
        )
    );
}

export async function saveVocabularyOffline(
    vocabulary: VocabularyResponse
): Promise<void> {
    const db = await getDB();
    await db.put(
        "vocabulary",
        { data: vocabulary, savedAt: Date.now() },
        OFFLINE_CACHE_KEY
    );
}

export async function loadVocabularyOffline(): Promise<VocabularyResponse | null> {
    const db = await getDB();
    const record = await db.get("vocabulary", OFFLINE_CACHE_KEY);
    return record?.data ?? null;
}

export async function saveLibraryOffline(
    library: LibraryMediasResponse
): Promise<void> {
    const db = await getDB();
    await db.put(
        "library",
        { data: library, savedAt: Date.now() },
        OFFLINE_CACHE_KEY
    );
}

export async function loadLibraryOffline(): Promise<LibraryMediasResponse | null> {
    const db = await getDB();
    const record = await db.get("library", OFFLINE_CACHE_KEY);
    return record?.data ?? null;
}
