import { useEffect, useState } from "react";
import { useStore } from "@nanostores/react";
import { apiFetch } from "./api";
import {
    createPlaylistLocally,
    deletePlaylistLocally,
    likeMediaLocally,
    unlikeMediaLocally,
    updatePlaylistLocally,
} from "./database/localDBManager";
import { pendingSyncCountAtom } from "./database/offlineProvider";
import { getConnectivity, isOnlineAtom } from "./network/connectivity";

interface UseOfflineApiFetchResult<T> {
    data: T | null;
    loading: boolean;
    error: string | null;
    refetch: () => Promise<void>;
    isLocal: boolean;
}

type FetchStrategy = "online-first" | "local-first" | "local-only";

export function useOfflineApiFetch<T>(
    path: string,
    schema: { parse: (data: unknown) => T },
    options: {
        strategy?: FetchStrategy;
        dependsOn?: unknown[];
    } = {}
): UseOfflineApiFetchResult<T> {
    const [data, setData] = useState<T | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isLocal, setIsLocal] = useState(false);
    const online = useStore(isOnlineAtom);

    const { strategy = "local-first", dependsOn = [] } = options;

    async function load(): Promise<void> {
        setLoading(true);
        setError(null);

        const isConnected = await getConnectivity();
        setIsLocal(!isConnected);

        if (
            strategy === "online-first" ||
            (!isConnected && strategy !== "local-only")
        ) {
            const result = await apiFetch(path, schema);
            if (result.isOk()) {
                setData(result.result);
            } else if (
                strategy === "local-first" &&
                !result.isOk() &&
                !isConnected
            ) {
                setError(result.message);
            }
        }
        setLoading(false);
    }

    useEffect(() => {
        load();
    }, [path, online, ...dependsOn]);

    return { data, loading, error, refetch: load, isLocal };
}

export async function offlineLike(
    publicId: string,
    mediaType: string
): Promise<boolean> {
    const online = await getConnectivity();

    if (online) {
        try {
            const result = await apiFetch("/media/like", {
                parse: (d) => d as { ok: boolean },
            });
            if (result.isOk()) {
                await likeMediaLocally(publicId, mediaType);
                return true;
            }
        } catch {
            // Fall through to local
        }
    }

    await likeMediaLocally(publicId, mediaType);
    return true;
}

export async function offlineUnlike(publicId: string): Promise<boolean> {
    const online = await getConnectivity();

    if (online) {
        try {
            const result = await apiFetch("/media/like", {
                parse: (d) => d as { ok: boolean },
            });
            if (result.isOk()) {
                await unlikeMediaLocally(publicId);
                return true;
            }
        } catch {
            // Fall through to local
        }
    }

    await unlikeMediaLocally(publicId);
    return true;
}

export async function offlineCreatePlaylist(
    name: string
): Promise<{ success: boolean; publicId: string }> {
    const publicId = `local_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const online = await getConnectivity();

    if (online) {
        try {
            const result = await apiFetch("/playlist", {
                parse: (d) => d as { publicId: string },
            });
            if (result.isOk()) {
                return { success: true, publicId: result.result.publicId };
            }
        } catch {
            // Fall through to local
        }
    }

    await createPlaylistLocally(name, publicId);
    return { success: true, publicId };
}

export async function offlineUpdatePlaylist(
    publicId: string,
    name: string
): Promise<boolean> {
    const online = await getConnectivity();

    if (online) {
        try {
            const result = await apiFetch(`/playlist/${publicId}`, {
                parse: (d) => d as { name: string },
            });
            if (result.isOk()) {
                return true;
            }
        } catch {
            // Fall through to local
        }
    }

    await updatePlaylistLocally(publicId, name);
    return true;
}

export async function offlineDeletePlaylist(
    publicId: string
): Promise<boolean> {
    const online = await getConnectivity();

    if (online) {
        try {
            const result = await apiFetch(`/playlist/${publicId}`, {
                parse: (d) => d as unknown,
            });
            if (result.isOk()) {
                return true;
            }
        } catch {
            // Fall through to local
        }
    }

    await deletePlaylistLocally(publicId);
    return true;
}
