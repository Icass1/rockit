import { atom } from "nanostores";
import { apiFetch } from "../api";
import { getConnectivity } from "../network/connectivity";
import * as LocalDB from "./localDBManager";
import {
    getPendingSyncOperations,
    markSynced,
    clearSyncQueue,
    type SyncQueueItem,
} from "./syncQueue";
import type { LocalSong, LocalAlbum, LocalPlaylist } from "./localTypes";
import type { BaseArtistResponse } from "@rockit/shared";

export const isSyncingAtom = atom<boolean>(false);
export const lastSyncErrorAtom = atom<string | null>(null);
export const pendingSyncCountAtom = atom<number>(0);

const SYNC_TABLES = [
    "user",
    "songs",
    "albums",
    "artists",
    "playlists",
    "liked_media",
] as const;

export async function ensureOnlineDataProviderInitialized(): Promise<void> {
    const count = await getPendingSyncOperations();
    pendingSyncCountAtom.set(count.length);
}

export async function pullFromBackend<T>(
    endpoint: string,
    schema: { parse: (data: unknown) => T }
): Promise<T | null> {
    const online = await getConnectivity();
    if (!online) return null;

    try {
        const result = await apiFetch(endpoint, schema);
        if (result.isOk()) {
            return result.result;
        }
    } catch {
        // Network or parse error - return null
    }
    return null;
}

export async function pullUserProfile(): Promise<boolean> {
    const online = await getConnectivity();
    if (!online) return false;

    try {
        const result = await apiFetch("/session", {
            parse: (data: unknown) => data as {
                id: number;
                username: string;
                lang: string;
                crossfade: number;
                random_queue: boolean;
                repeat_mode: string;
            },
        });

        if (result.isOk()) {
            const user = result.result;
            await LocalDB.saveUser(
                {
                    id: user.id,
                    username: user.username,
                    lang: user.lang,
                    crossfade: user.crossfade,
                    randomQueue: user.random_queue,
                    repeatMode: user.repeat_mode,
                },
                true
            );
            return true;
        }
    } catch {
        // Ignore errors
    }
    return false;
}

export async function pullLibrary(): Promise<boolean> {
    const online = await getConnectivity();
    if (!online) return false;

    const schema = {
        parse: (data: unknown) => data as {
            albums: LocalAlbum[];
            playlists: LocalPlaylist[];
            songs: LocalSong[];
            videos: unknown[];
        },
    };

    try {
        const result = await apiFetch("/library", schema);
        if (!result.isOk()) return false;

        const library = result.result;

        await LocalDB.saveAlbums(library.albums);
        await LocalDB.savePlaylists(library.playlists);
        await LocalDB.saveSongs(library.songs);

        await LocalDB.setLastSyncTimestamp("library");
        return true;
    } catch {
        return false;
    }
}

export async function pullHomeStats(): Promise<boolean> {
    const online = await getConnectivity();
    if (!online) return false;

    const schema = {
        parse: (data: unknown) => data as {
            songsByTimePlayed: LocalSong[];
            randomSongsLastMonth: LocalSong[];
        },
    };

    try {
        const result = await apiFetch("/stats/home", schema);
        if (!result.isOk()) return false;

        const stats = result.result;

        await LocalDB.saveSongs(stats.songsByTimePlayed);
        await LocalDB.saveSongs(stats.randomSongsLastMonth);

        await LocalDB.setLastSyncTimestamp("home");
        return true;
    } catch {
        return false;
    }
}

export async function pullLikedMedia(): Promise<boolean> {
    const schema = {
        parse: (data: unknown) => data as {
            songs: { publicId: string }[];
            albums: { publicId: string }[];
        },
    };

    try {
        const result = await apiFetch("/media/liked", schema);
        if (!result.isOk()) return false;

        const liked = result.result;

        for (const song of liked.songs) {
            await LocalDB.likeMediaLocally(song.publicId, "song");
        }
        for (const album of liked.albums) {
            await LocalDB.likeMediaLocally(album.publicId, "album");
        }

        await LocalDB.setLastSyncTimestamp("liked_media");
        return true;
    } catch {
        return false;
    }
}

export async function pushPendingToBackend(): Promise<boolean> {
    const online = await getConnectivity();
    if (!online) return false;

    const pending = await getPendingSyncOperations();
    if (pending.length === 0) return true;

    isSyncingAtom.set(true);
    lastSyncErrorAtom.set(null);

    const syncedIds: number[] = [];

    for (const item of pending) {
        try {
            const success = await pushOperationToBackend(item);
            if (success) {
                syncedIds.push(item.id);
            }
        } catch {
            lastSyncErrorAtom.set(`Failed to sync: ${item.operation} ${item.tableName}`);
        }
    }

    if (syncedIds.length > 0) {
        await markSynced(syncedIds);
        await clearSyncQueue();
    }

    const remaining = await getPendingSyncOperations();
    pendingSyncCountAtom.set(remaining.length);

    isSyncingAtom.set(false);
    return syncedIds.length === pending.length;
}

async function pushOperationToBackend(item: SyncQueueItem): Promise<boolean> {
    const { operation, tableName, data } = item;

    if (tableName === "playlists") {
        if (operation === "create") {
            const result = await apiFetch("/playlist", {
                parse: (d) => d as { publicId: string },
            });
            return result.isOk();
        }
        if (operation === "update") {
            const result = await apiFetch(`/playlist/${data.public_id}`, {
                parse: (d) => d as { name: string },
            });
            return result.isOk();
        }
        if (operation === "delete") {
            const result = await apiFetch(`/playlist/${data.public_id}`, {
                parse: (d) => d as unknown,
            });
            return result.isOk();
        }
    }

    if (tableName === "liked_media") {
        if (operation === "create") {
            const result = await apiFetch("/media/like", {
                parse: (d) => d as { ok: boolean },
            });
            return result.isOk();
        }
        if (operation === "delete") {
            const result = await apiFetch("/media/like", {
                parse: (d) => d as { ok: boolean },
            });
            return result.isOk();
        }
    }

    if (tableName === "user_settings") {
        if (operation === "update") {
            const result = await apiFetch(
                `/user/lang`,
                { parse: (d) => d as unknown },
                { method: "PATCH", body: JSON.stringify({ lang: data.lang }) }
            );
            return result.isOk();
        }
    }

    return false;
}

export async function fullSync(): Promise<boolean> {
    const online = await getConnectivity();
    if (!online) return false;

    isSyncingAtom.set(true);

    await pullUserProfile();
    await pullLibrary();
    await pullLikedMedia();
    await pullHomeStats();

    await pushPendingToBackend();

    isSyncingAtom.set(false);
    return true;
}

export async function getSongFromLocalOrRemote(
    publicId: string
): Promise<LocalSong | null> {
    const local = await LocalDB.getSong(publicId);
    if (local) return local;

    const online = await getConnectivity();
    if (!online) return null;

    try {
        const result = await apiFetch(`/song/${publicId}`, {
            parse: (d) => d as LocalSong,
        });
        if (result.isOk()) {
            const song = result.result;
            await LocalDB.saveSongs([song]);
            return song;
        }
    } catch {
        // Ignore
    }
    return null;
}

export async function getAlbumFromLocalOrRemote(
    publicId: string
): Promise<LocalAlbum | null> {
    const local = await LocalDB.getAlbum(publicId);
    if (local) return local;

    const online = await getConnectivity();
    if (!online) return null;

    try {
        const result = await apiFetch(`/album/${publicId}`, {
            parse: (d) => d as LocalAlbum,
        });
        if (result.isOk()) {
            const album = result.result;
            await LocalDB.saveAlbums([album]);
            return album;
        }
    } catch {
        // Ignore
    }
    return null;
}

export async function getPlaylistFromLocalOrRemote(
    publicId: string
): Promise<LocalPlaylist | null> {
    const local = await LocalDB.getPlaylist(publicId);
    if (local) return local;

    const online = await getConnectivity();
    if (!online) return null;

    try {
        const result = await apiFetch(`/playlist/${publicId}`, {
            parse: (d) => d as LocalPlaylist,
        });
        if (result.isOk()) {
            const playlist = result.result;
            await LocalDB.savePlaylists([playlist]);
            return playlist;
        }
    } catch {
        // Ignore
    }
    return null;
}