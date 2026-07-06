import {
    BaseSearchResultsItem,
    EEvent,
    EWebSocketMessage,
    isPlayable,
    isQueueable,
} from "@rockit/packages/shared";
import { EDownloadInfoStatus } from "@/models/enums/downloadInfoStatus";
import { IMediaDownloadedEvent } from "@/models/interfaces/events/mediaDownloaded";
import { Http } from "@/lib/http";
import { rockIt } from "@/lib/rockit/rockIt";
import { ArrayAtom, createArrayAtom } from "@/lib/store";

export interface DownloadInfo {
    publicId: string;
    message: string;
    completed: number;
    status: EDownloadInfoStatus;
}

export class DownloaderManager {
    private _downloadInfoAtom = createArrayAtom<DownloadInfo>([]);
    private _initialized = false;

    async init(): Promise<void> {
        if (this._initialized) {
            return;
        }

        rockIt.webSocketManager.onMessage(
            EWebSocketMessage.DownloadProgress,
            (data) => {
                rockIt.eventManager.dispatchEvent(EEvent.MediaDownloadStatus, {
                    publicId: data.mediaPublicId,
                    completed: data.progress,
                    message: data.status,
                });
                if (data.progress === 100)
                    rockIt.eventManager.dispatchEvent(EEvent.MediaDownloaded, {
                        publicId: data.mediaPublicId,
                    });
            }
        );

        // console.log("DownloaderManager.init");
        this._initialized = true;
    }

    get downloadInfoAtom(): ArrayAtom<DownloadInfo> {
        return this._downloadInfoAtom;
    }

    async startDownloadAsync(publicId: string, name: string): Promise<void> {
        try {
            const response = await Http.startDownload({
                ids: [publicId], // The API expects an array of IDs/URLs
                title: name,
            });

            if (response.isOk()) {
                rockIt.notificationManager.notifySuccess(
                    rockIt.vocabularyManager.vocabulary.DOWNLOAD_STARTED
                );
            } else {
                rockIt.notificationManager.notifyError(
                    rockIt.vocabularyManager.vocabulary.ERROR_STARTING_DOWNLOAD
                );
                console.error(
                    "Error starting download",
                    response.message,
                    response.detail
                );
                throw new Error(response.message || "Failed to start download");
            }
        } catch (error) {
            console.error("Error in startDownloadAsync:", error);
            throw error;
        }
    }

    async downloadSearchResultAndPlayAsync(
        searchItem: BaseSearchResultsItem
    ): Promise<void> {
        const result = await Http.startDownloadFromUrl({
            url: searchItem.providerUrl,
            addToPlaylist: false,
            addToLibrary: false,
            playlistPublicId: null,
        });

        if (!result.isOk()) {
            rockIt.notificationManager.notifyError(result.message);
            console.error(
                "Error starting download from URL",
                result.message,
                result.detail
            );
            return;
        }

        rockIt.notificationManager.notifySuccess(
            rockIt.vocabularyManager.vocabulary.DOWNLOAD_STARTED
        );

        const publicId = result.result.data.publicId;

        const handleDownloaded = (data: IMediaDownloadedEvent): void => {
            if (data.publicId !== publicId) return;

            rockIt.eventManager.removeEventListener(
                EEvent.MediaDownloaded,
                handleDownloaded
            );

            rockIt.mediaManager.getMedia(publicId).then((mediaResult): void => {
                if (!mediaResult.isOk()) {
                    console.error(
                        "Error getting downloaded media",
                        mediaResult.message,
                        mediaResult.detail
                    );
                    return;
                }

                const song = mediaResult.result.media;
                if (!isQueueable(song) || !isPlayable(song)) return;

                rockIt.queueManager.setMedia([song], song.publicId);
                rockIt.queueManager.moveToMedia(song.publicId);
                rockIt.mediaPlayerManager.play();
            });
        };

        rockIt.eventManager.addEventListener(
            EEvent.MediaDownloaded,
            handleDownloaded
        );
    }

    async downloadMediaAsync(publicIds: string[], name: string): Promise<void> {
        const response = await Http.startDownload({
            ids: publicIds,
            title: name,
        });

        if (response.isOk()) {
            rockIt.notificationManager.notifySuccess(
                rockIt.vocabularyManager.vocabulary.DOWNLOAD_STARTED
            );
        } else {
            rockIt.notificationManager.notifyError(
                rockIt.vocabularyManager.vocabulary.ERROR_STARTING_DOWNLOAD
            );
            console.error(
                "Error starting download",
                response.message,
                response.detail
            );
        }
    }
}
