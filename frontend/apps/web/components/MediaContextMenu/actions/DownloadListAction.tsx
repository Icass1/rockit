import type { JSX } from "react";
import {
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

export default function DownloadListAction({
    media,
    vocabulary,
}: ActionComponentProps): JSX.Element | null {
    if (isSearchResult(media)) return null;

    const downloadableMedia: TMedia[] = [];
    if (isAlbumWithSongs(media)) {
        downloadableMedia.push(...media.songs);
    } else if (isPlaylistWithMedias(media)) {
        downloadableMedia.push(...media.medias.map((m) => m.item));
    }

    const notDownloaded = downloadableMedia.filter(
        (m): boolean => isDownloadable(m) && m.downloaded !== true
    );

    if (notDownloaded.length === 0) return null;

    const downloadAll = (): void => {
        const ids = notDownloaded.map((m) => m.publicId);
        rockIt.downloaderManager.downloadMediaAsync(ids, media.name);
    };

    return (
        <ContextMenuOption onClick={downloadAll}>
            <Download className="h-5 w-5" />
            {vocabulary.DOWNLOAD_LIST_TO_SERVER}
            {` (${notDownloaded.length})`}
        </ContextMenuOption>
    );
}
