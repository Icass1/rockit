import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { BaseSongWithAlbumResponse } from "@/dto";
import { useStore } from "@nanostores/react";
import { rockIt } from "@/lib/rockit/rockIt";
import { networkStatus } from "@/lib/stores/networkStatus";

export interface UserList {
    id: string;
    name: string;
    image: string;
    containSong: boolean;
}

export function useSongContextMenu(song: BaseSongWithAlbumResponse) {
    const router = useRouter();
    const $networkStatus = useStore(networkStatus);
    const $likedSongs = useStore(rockIt.songManager.likedSongsAtom);

    const [userLists, setUserLists] = useState<UserList[]>([]);

    const offline = $networkStatus === "offline";
    const isLiked = $likedSongs.includes(song.publicId);
    const canShare =
        typeof navigator !== "undefined" &&
        typeof navigator.share !== "undefined" &&
        !offline;

    const fetchUserLists = useCallback(async () => {
        if (userLists.length > 0) return;
        try {
            const res = await fetch(`/api/song/${song.publicId}/lists`);
            if (!res.ok) return;
            const data = await res.json();
            setUserLists(data);
        } catch {
            // Non-fatal — sub-menu stays empty if fetch fails
        }
    }, [song.publicId, userLists.length]);

    const handleToggleLike = useCallback(() => {
        rockIt.songManager.toggleLikeSong(song.publicId);
    }, [song.publicId]);

    const handlePlayNext = useCallback(() => {
        rockIt.queueManager.addSongNext(song);
    }, [song]);

    const handleAddToQueue = useCallback(() => {
        rockIt.queueManager.addSongToEnd(song);
    }, [song]);

    const handleShare = useCallback(() => {
        navigator.share({
            title: "RockIt!",
            text: `${song.name} ${song.album.name} ${song.artists
                .map((a) => a.name)
                .join(", ")}`,
            url: `/song/${song.publicId}`,
        });
    }, [song]);

    const handleCopyUrl = useCallback(() => {
        navigator.clipboard.writeText(
            `${location.origin}/song/${song.publicId}`
        );
    }, [song.publicId]);

    const handleDownloadToDevice = useCallback(() => {
        rockIt.indexedDBManager.saveSongToIndexedDB(song);
    }, [song]);

    const handleGoToArtist = useCallback(() => {
        router.push(`/artist/${song.artists[0].publicId}`);
    }, [router, song.artists]);

    const handleGoToAlbum = useCallback(() => {
        router.push(`/album/${song.album.publicId}`);
    }, [router, song.album.publicId]);

    return {
        offline,
        isLiked,
        canShare,
        userLists,
        fetchUserLists,
        handleToggleLike,
        handlePlayNext,
        handleAddToQueue,
        handleShare,
        handleCopyUrl,
        handleDownloadToDevice,
        handleGoToArtist,
        handleGoToAlbum,
    };
}
