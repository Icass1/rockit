import { useStore } from "@nanostores/react";
import { rockIt } from "@/lib/rockit/rockIt";

interface Song {
    publicId: string;
    downloaded: boolean;
    duration?: number;
}

interface UseListDownloadOptions {
    publicId: string;
    type: "album" | "playlist";
    songs: Song[];
}

/**
 * Centralises all download-state derivations for an album or playlist header.
 *
 * Fixes two bugs present in both PlaylistHeader and RenderAlbum:
 *  1. `.subscribe()` called without returning the unsubscribe → memory leak on unmount.
 *     Replaced with `useStore` which subscribes/unsubscribes automatically.
 *  2. `list.publicId == list.publicId` (always true) → now correctly compares
 *     against the prop `publicId`.
 */
export function useListDownload({
    publicId,
    type,
    songs,
}: UseListDownloadOptions) {
    // useStore is the correct nanostores/react API — it cleans up on unmount.
    const $downloadingLists = useStore(
        rockIt.downloaderManager.downloadingListsAtom
    );
    const $downloadingSongsStatus = useStore(
        rockIt.downloaderManager.downloadingSongsStatusAtom
    );

    // Fixed: was list.publicId == list.publicId (always true)
    const isDownloading = $downloadingLists.some(
        (list) => list.type === type && list.publicId === publicId
    );

    const downloadProgress = (() => {
        if (!$downloadingSongsStatus.length || !songs.length) return 0;
        let completed = 0;
        for (const status of $downloadingSongsStatus) {
            if (songs.find((s) => s.publicId === status.publicId)) {
                completed +=
                    status.message === "Error" ? 100 : status.completed;
            }
        }
        return completed / songs.length;
    })();

    const downloadCount = songs.filter((s) => s.downloaded).length;
    const allDownloaded = songs.every((s) => s.downloaded);
    const anyDownloaded = songs.some((s) => s.downloaded);

    return {
        isDownloading,
        downloadProgress,
        downloadCount,
        allDownloaded,
        anyDownloaded,
    };
}
