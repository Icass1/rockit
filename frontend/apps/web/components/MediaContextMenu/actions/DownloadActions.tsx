import type { JSX } from "react";
import type { BaseSearchResultsItem } from "@/dto";
import { isSearchResult } from "@rockit/shared";
import { HardDriveDownload, Play, RefreshCw } from "lucide-react";
import { Http } from "@/lib/http";
import { rockIt } from "@/lib/rockit/rockIt";
import ContextMenuOption from "@/components/ContextMenu/Option";
import type { ActionComponentProps } from "@/components/MediaContextMenu/actions/ActionProps";

export function DownloadAction({
    media,
    vocabulary,
}: ActionComponentProps): JSX.Element {
    const download = (): void => {
        if (!isSearchResult(media)) rockIt.mediaManager.downloadMedia(media);
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
        if (!isSearchResult(media)) rockIt.mediaManager.downloadMedia(media);
    };

    return (
        <ContextMenuOption onClick={retryDownload}>
            <RefreshCw className="h-5 w-5" />
            {vocabulary.RETRY}
        </ContextMenuOption>
    );
}

async function addFromUrlThenDownload(
    media: ActionComponentProps["media"],
    addToLibrary: boolean
): Promise<void> {
    const searchItem = media as BaseSearchResultsItem;
    const result = await Http.startDownloadFromUrl({
        url: searchItem.providerUrl,
        addToPlaylist: false,
        addToLibrary,
        playlistPublicId: null,
    });
    if (!result.isOk()) {
        rockIt.notificationManager.notifyError(result.message);
        return;
    }
    rockIt.notificationManager.notifySuccess(
        rockIt.vocabularyManager.vocabulary.DOWNLOAD_STARTED
    );
}

export function DownloadSearchResultAndPlayAction({
    media,
    vocabulary,
}: ActionComponentProps): JSX.Element {
    const downloadAndPlay = (): void => {
        rockIt.downloaderManager.downloadSearchResultAndPlayAsync(
            media as BaseSearchResultsItem
        );
    };

    return (
        <ContextMenuOption onClick={downloadAndPlay}>
            <Play className="h-5 w-5" />
            {vocabulary.DOWNLOAD_AND_PLAY}
        </ContextMenuOption>
    );
}

export function DownloadSearchResultAction({
    media,
    vocabulary,
}: ActionComponentProps): JSX.Element {
    const download = (): void => {
        addFromUrlThenDownload(media, false);
    };

    return (
        <ContextMenuOption onClick={download}>
            <HardDriveDownload className="h-5 w-5" />
            {vocabulary.DOWNLOAD_TO_SERVER}
        </ContextMenuOption>
    );
}

export function DownloadSearchResultAndAddToLibraryAction({
    media,
    vocabulary,
}: ActionComponentProps): JSX.Element {
    const download = (): void => {
        addFromUrlThenDownload(media, true);
    };

    return (
        <ContextMenuOption onClick={download}>
            <HardDriveDownload className="h-5 w-5" />
            {vocabulary.DOWNLOAD_AND_ADD_TO_LIBRARY}
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
