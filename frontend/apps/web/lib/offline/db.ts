import { openDB, type DBSchema, type IDBPDatabase } from "idb";

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
}

const DB_NAME = "rockit-offline-media";
const DB_VERSION = 1;
let dbPromise: Promise<IDBPDatabase<RockItOfflineDB>> | null = null;

function getDB(): Promise<IDBPDatabase<RockItOfflineDB>> {
    if (!dbPromise) {
        dbPromise = openDB<RockItOfflineDB>(DB_NAME, DB_VERSION, {
            upgrade(db) {
                if (!db.objectStoreNames.contains("songs")) {
                    db.createObjectStore("songs", { keyPath: "publicId" });
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
            const coverFetchUrl =
                process.env.NODE_ENV === "development"
                    ? coverUrl
                    : `/_next/image?url=${encodeURIComponent(coverUrl)}&w=600&q=75`;
            const coverRes = await fetch(coverFetchUrl);
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
