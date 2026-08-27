import type { JSX } from "react";
import { useEffect, useState } from "react";
import { useStore } from "@nanostores/react";
import { isSearchResult, type TMedia } from "@rockit/shared";
import { CircleArrowDown, Loader2, Trash2 } from "lucide-react";
import {
    downloadSongOffline,
    offlineStatusMap,
    removeOfflineSong,
} from "@/lib/offline/store";
import { rockIt } from "@/lib/rockit/rockIt";
import ContextMenuOption from "@/components/ContextMenu/Option";
import type { ActionComponentProps } from "@/components/MediaContextMenu/actions/ActionProps";

export default function SaveOfflineAction({
    media,
    vocabulary,
    listPublicId,
}: ActionComponentProps): JSX.Element {
    const $status = useStore(offlineStatusMap);
    const isSongType =
        !isSearchResult(media) && (media as TMedia).type === "song";
    const publicId = isSongType
        ? (media as TMedia & { publicId: string }).publicId
        : undefined;
    const status = publicId ? ($status[publicId] ?? "idle") : "idle";
    const [downloading, setDownloading] = useState(false);

    useEffect(() => {
        setDownloading(status === "downloading");
    }, [status]);

    const handleClick = async (): Promise<void> => {
        if (!publicId || !isSongType) return;
        if (status === "downloaded") {
            await removeOfflineSong(publicId);
            return;
        }
        const audioUrl = (media as TMedia & { audioUrl?: string | null })
            .audioUrl;
        if (!audioUrl) return;

        // Settle parent references at save time so the Offline chip can group
        // albums/playlists without any network call later.
        const songAlbum = (media as TMedia & { album?: { publicId?: string } })
            .album;
        const parentAlbumIds = songAlbum?.publicId
            ? [songAlbum.publicId]
            : [];
        const parentPlaylistIds = listPublicId ? [listPublicId] : [];

        setDownloading(true);
        try {
            await downloadSongOffline(
                publicId,
                audioUrl,
                media.imageUrl ?? null,
                parentAlbumIds,
                parentPlaylistIds
            );
        } catch (err) {
            if (err instanceof Error && err.message === "STORAGE_FULL") {
                rockIt.notificationManager.notifyError("Storage full");
            }
        } finally {
            setDownloading(false);
        }
    };

    const icon =
        downloading || status === "downloading" ? (
            <Loader2 className="h-5 w-5 animate-spin" />
        ) : status === "downloaded" ? (
            <Trash2 className="h-5 w-5" />
        ) : (
            <CircleArrowDown className="h-5 w-5" />
        );

    const label =
        status === "downloaded"
            ? vocabulary.REMOVE_OFFLINE
            : status === "downloading" || downloading
              ? vocabulary.DOWNLOADING
              : vocabulary.SAVE_OFFLINE;

    return (
        <ContextMenuOption
            onClick={handleClick}
            disable={status === "downloading" || !publicId}
        >
            {icon}
            {label}
        </ContextMenuOption>
    );
}
