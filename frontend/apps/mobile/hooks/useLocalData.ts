import { useEffect, useState } from "react";
import { useStore } from "@nanostores/react";
import * as LocalDB from "@/lib/database/localDBManager";
import type {
    LocalAlbum,
    LocalPlaylist,
    LocalSong,
    LocalUser,
} from "@/lib/database/localTypes";
import {
    fullSync,
    getAlbumFromLocalOrRemote,
    getPlaylistFromLocalOrRemote,
    getSongFromLocalOrRemote,
    isSyncingAtom,
} from "@/lib/database/offlineProvider";
import { isOnlineAtom } from "@/lib/network/connectivity";

export function useLocalSong(publicId: string | null) {
    const [data, setData] = useState<LocalSong | null>(null);
    const [loading, setLoading] = useState(true);
    const online = useStore(isOnlineAtom);

    useEffect(() => {
        if (!publicId) {
            setData(null);
            setLoading(false);
            return;
        }

        setLoading(true);
        getSongFromLocalOrRemote(publicId).then((song) => {
            setData(song);
            setLoading(false);
        });
    }, [publicId, online]);

    return { data, loading };
}

export function useLocalAlbum(publicId: string | null) {
    const [data, setData] = useState<LocalAlbum | null>(null);
    const [loading, setLoading] = useState(true);
    const online = useStore(isOnlineAtom);

    useEffect(() => {
        if (!publicId) {
            setData(null);
            setLoading(false);
            return;
        }

        setLoading(true);
        getAlbumFromLocalOrRemote(publicId).then((album) => {
            setData(album);
            setLoading(false);
        });
    }, [publicId, online]);

    return { data, loading };
}

export function useLocalPlaylist(publicId: string | null) {
    const [data, setData] = useState<LocalPlaylist | null>(null);
    const [loading, setLoading] = useState(true);
    const online = useStore(isOnlineAtom);

    useEffect(() => {
        if (!publicId) {
            setData(null);
            setLoading(false);
            return;
        }

        setLoading(true);
        getPlaylistFromLocalOrRemote(publicId).then((playlist) => {
            setData(playlist);
            setLoading(false);
        });
    }, [publicId, online]);

    return { data, loading };
}

export function useLocalPlaylists() {
    const [data, setData] = useState<LocalPlaylist[]>([]);
    const [loading, setLoading] = useState(true);
    const online = useStore(isOnlineAtom);

    useEffect(() => {
        setLoading(true);
        LocalDB.getAllPlaylists().then((playlists) => {
            setData(playlists);
            setLoading(false);
        });
    }, [online]);

    return { data, loading };
}

export function useLocalLikedMedia() {
    const [data, setData] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const online = useStore(isOnlineAtom);

    useEffect(() => {
        setLoading(true);
        LocalDB.getLikedMediaPublicIds().then((ids) => {
            setData(ids);
            setLoading(false);
        });
    }, [online]);

    return { data, loading };
}

export function useLocalUser() {
    const [data, setData] = useState<LocalUser | null>(null);
    const [loading, setLoading] = useState(true);
    const online = useStore(isOnlineAtom);

    useEffect(() => {
        setLoading(true);
        LocalDB.getUser().then((user) => {
            setData(user);
            setLoading(false);
        });
    }, [online]);

    return { data, loading };
}

export function useSyncStatus() {
    const isSyncing = useStore(isSyncingAtom);
    return { isSyncing, sync: fullSync };
}
