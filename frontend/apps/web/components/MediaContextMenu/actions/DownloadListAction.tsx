import type { JSX } from "react";
import { isSearchResult } from "@rockit/shared";
import { Download } from "lucide-react";
import { rockIt } from "@/lib/rockit/rockIt";
import ContextMenuOption from "@/components/ContextMenu/Option";
import type { ActionComponentProps } from "@/components/MediaContextMenu/actions/ActionProps";

export default function DownloadListAction({
    media,
    vocabulary,
}: ActionComponentProps): JSX.Element | null {
    if (isSearchResult(media)) return null;

    if (media.type !== "album" && media.type !== "playlist") return null;

    if (
        "undownloadedCount" in media &&
        media.undownloadedCount !== undefined &&
        media.undownloadedCount === 0
    )
        return null;

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
        </ContextMenuOption>
    );
}
