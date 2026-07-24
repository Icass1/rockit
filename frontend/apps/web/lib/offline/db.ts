import {
    openDB,
    type DBSchema,
    type IDBPDatabase,
} from "idb";
import type { SessionResponse, VocabularyResponse } from "@/dto";

interface RockItOfflineDB extends DBSchema {
    songs: {
        key: string;
        value: {
            publicId: string;
            audioBlob: Blob;
            coverBlob: Blob | null;
            downloadedAt: number;
            sizeBytes: number;
        };
    };
    session: {
        key: string;
        value: { data: SessionResponse; savedAt: number };
    };
    vocabulary: {
        key: string;
        value: { data: VocabularyResponse; savedAt: number };
    };
}

const DB_NAME = "rockit-offline-media";
const DB_VERSION = 2;
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
            },
        });
    }
    return dbPromise;
}

export async function saveSongOffline(
    publicId: string,
    audioUrl: string,
    coverUrl: string | null
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
        await db.put("songs", {
            publicId,
            audioBlob,
            coverBlob,
            downloadedAt: Date.now(),
            sizeBytes: audioBlob.size + (coverBlob?.size ?? 0),
        });
    } catch (err) {
        if (err instanceof DOMException && err.name === "QuotaExceededError") {
            throw new Error("STORAGE_FULL");
        }
        throw err;
    }
}

export async function getOfflineSong(publicId: string) {
    const db = await getDB();
    return db.get("songs", publicId);
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
    await db.put("session", { data: session, savedAt: Date.now() }, OFFLINE_CACHE_KEY);
}

export async function loadSessionOffline(): Promise<SessionResponse | null> {
    const db = await getDB();
    const record = await db.get("session", OFFLINE_CACHE_KEY);
    return record?.data ?? null;
}

export async function clearSessionOffline(): Promise<void> {
    const db = await getDB();
    await db.delete("session", OFFLINE_CACHE_KEY);
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
