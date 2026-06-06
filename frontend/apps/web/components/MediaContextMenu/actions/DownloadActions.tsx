import type { JSX } from "react";
import { HardDriveDownload, RefreshCw } from "lucide-react";
import { isSearchResult } from "@rockit/shared";
import { rockIt } from "@/lib/rockit/rockIt";
import ContextMenuOption from "@/components/ContextMenu/Option";
import type { ActionComponentProps } from "./ActionProps";

export function DownloadAction({
    media,
    vocabulary,
}: ActionComponentProps): JSX.Element {
    const download = (): void => {
        if (!isSearchResult(media))
            rockIt.mediaManager.downloadMedia(media);
    };

    return (
        <ContextMenuOption onClick={download}>
            <HardDriveDownload className="h-5 w-5" />
            {vocabulary.DOWNLOAD}
        </ContextMenuOption>
    );
}

export function RetryDownloadAction({
    media,
    vocabulary,
}: ActionComponentProps): JSX.Element {
    const retryDownload = (): void => {
        if (!isSearchResult(media))
            rockIt.mediaManager.downloadMedia(media);
    };

    return (
        <ContextMenuOption onClick={retryDownload}>
            <RefreshCw className="h-5 w-5" />
            {vocabulary.RETRY}
        </ContextMenuOption>
    );
}

export function DownloadZipAction({
    vocabulary,
}: ActionComponentProps): JSX.Element {
    const downloadZip = (): void => {
        console.warn("TODO: Download ZIP");
    };

    return (
        <ContextMenuOption onClick={downloadZip}>
            <HardDriveDownload className="h-5 w-5" />
            {vocabulary.DOWNLOAD_ZIP}
        </ContextMenuOption>
    );
}
