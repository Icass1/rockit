import type { JSX } from "react";
import {
    EMediaType,
    isAlbumWithSongs,
    isDownloadable,
    isPlaylistWithMedias,
    isSearchResult,
    TMedia,
} from "@rockit/shared";
import { Download } from "lucide-react";
import { rockIt } from "@/lib/rockit/rockIt";
import ContextMenuOption from "@/components/ContextMenu/Option";
import type { ActionComponentProps } from "@/components/MediaContextMenu/actions/ActionProps";

/**
 * Number of children still missing from the server, or undefined when the
 * container was loaded without them (the library sends albums and playlists
 * with no children, so nothing can be counted there).
 */
function getPendingCount(media: TMedia): number | undefined {
    if (
        "undownloadedCount" in media &&
        typeof media.undownloadedCount === "number"
    ) {
        return media.undownloadedCount;
    }

    let children: TMedia[] | undefined;
    if (isAlbumWithSongs(media)) {
        children = media.songs;
    } else if (isPlaylistWithMedias(media)) {
        children = media.medias.map((m): TMedia => m.item);
    }
    if (!children) return undefined;

    return children.filter(
        (m): boolean => isDownloadable(m) && m.downloaded !== true
    ).length;
}

export default function DownloadListAction({
    media,
    vocabulary,
}: ActionComponentProps): JSX.Element | null {
    if (isSearchResult(media)) return null;

    if (media.type !== EMediaType.Album && media.type !== EMediaType.Playlist)
        return null;

    const pendingCount = getPendingCount(media);
    if (pendingCount === 0) return null;

    const downloadAll = (): void => {
        rockIt.downloaderManager.downloadMediaAsync(
            [media.publicId],
            media.name
        );
    };

    return (
        <ContextMenuOption onClick={downloadAll}>
            <Download className="h-5 w-5" />
            {vocabulary.DOWNLOAD_LIST_TO_SERVER}
            {pendingCount !== undefined && ` (${pendingCount})`}
        </ContextMenuOption>
    );
}
