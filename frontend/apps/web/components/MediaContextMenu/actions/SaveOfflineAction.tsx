import type { JSX } from "react";
import { useState, useEffect } from "react";
import { useStore } from "@nanostores/react";
import { CircleArrowDown, Trash2, Loader2 } from "lucide-react";
import { isSearchResult, type TMedia } from "@rockit/shared";
import ContextMenuOption from "@/components/ContextMenu/Option";
import {
    offlineStatusMap,
    downloadSongOffline,
    removeOfflineSong,
} from "@/lib/offline/store";
import type { ActionComponentProps } from "@/components/MediaContextMenu/actions/ActionProps";

export default function SaveOfflineAction({
    media,
    vocabulary,
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
        setDownloading(true);
        try {
            await downloadSongOffline(
                publicId,
                audioUrl,
                media.imageUrl ?? null
            );
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
