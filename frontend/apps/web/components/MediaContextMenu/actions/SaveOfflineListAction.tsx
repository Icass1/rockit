import type { JSX } from "react";
import { useEffect, useState } from "react";
import { useStore } from "@nanostores/react";
import {
    isAlbum,
    isPlaylist,
    isSearchResult,
    type TMedia,
} from "@rockit/shared";
import { CircleArrowDown, Loader2, Trash2 } from "lucide-react";
import { offlineStatusMap } from "@/lib/offline/store";
import { rockIt } from "@/lib/rockit/rockIt";
import ContextMenuOption from "@/components/ContextMenu/Option";
import type { ActionComponentProps } from "@/components/MediaContextMenu/actions/ActionProps";

/**
 * Download or remove an entire album/playlist on this device for offline use.
 *
 * The "already offline" count is computed purely from local IndexedDB data
 * (via the parent references stored at save time), so the "remove" state is
 * reachable even from the Library where albums/playlists arrive without their
 * children and without requiring any network call.
 */
export default function SaveOfflineListAction({
    media,
    vocabulary,
}: ActionComponentProps): JSX.Element | null {
    const $status = useStore(offlineStatusMap);
    const [downloading, setDownloading] = useState(false);
    const [offlineCount, setOfflineCount] = useState(0);

    const listMedia = media as unknown as TMedia;
    const isList =
        !isSearchResult(media) &&
        (isAlbum(listMedia) || isPlaylist(listMedia));
    const kind = isAlbum(listMedia) ? ("album" as const) : ("playlist" as const);

    useEffect((): (() => void) | undefined => {
        if (!isList) return;

        let cancelled = false;
        rockIt.offlineManager
            .getOfflineSongsFor(listMedia.publicId, kind)
            .then((records): void => {
                if (cancelled) return;
                setOfflineCount(records.length);
            })
            .catch(() => {});

        return (): void => {
            cancelled = true;
        };
    }, [listMedia.publicId, kind, isList, $status]);

    if (!isList) return null;

    const hasOffline = offlineCount > 0;

    const handleClick = async (): Promise<void> => {
        if (downloading) return;
        setDownloading(true);
        try {
            if (hasOffline) {
                await rockIt.offlineManager.removeMediaOffline(listMedia);
            } else {
                await rockIt.offlineManager.downloadMediaOffline(listMedia);
            }
        } finally {
            setDownloading(false);
        }
    };

    const icon =
        downloading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
        ) : hasOffline ? (
            <Trash2 className="h-5 w-5" />
        ) : (
            <CircleArrowDown className="h-5 w-5" />
        );

    const label = downloading
        ? vocabulary.DOWNLOADING
        : hasOffline
          ? vocabulary.REMOVE_OFFLINE
          : vocabulary.DOWNLOAD_LIST_TO_DEVICE;

    return (
        <ContextMenuOption onClick={handleClick} disable={downloading}>
            {icon}
            {label}
        </ContextMenuOption>
    );
}
