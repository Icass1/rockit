import {
    DownloadProgressMessage,
    EWebSocketMessage,
    StartDownloadRequestSchema,
    StartDownloadResponseSchema,
} from "@rockit/shared";
import { EDownloadInfoStatus } from "@/models/enums/downloadInfoStatus";
import { EEvent } from "@/models/enums/events";
import { rockIt } from "@/lib/rockit/rockIt";
import { createArrayAtom } from "@/lib/store";
import { apiPostFetch } from "@/lib/utils/apiFetch";

export interface DownloadInfo {
    publicId: string;
    message: string;
    completed: number;
    status: EDownloadInfoStatus;
}

export class DownloaderManager {
    private _downloadInfoAtom = createArrayAtom<DownloadInfo>([]);
    private _initialized = false;

    async init() {
        if (this._initialized) {
            return;
        }
        console.log("DownloaderManager.init");
        this._initialized = true;
        rockIt.webSocketManager.onMessage(
            EWebSocketMessage.DownloadProgress,
            this.updateDownloadProgress.bind(this)
        );
    }

    get downloadInfoAtom() {
        return this._downloadInfoAtom;
    }

    async startDownloadAsync(url: string) {
        try {
            const response = await apiPostFetch(
                "/downloads/start",
                StartDownloadRequestSchema,
                StartDownloadResponseSchema,
                {
                    ids: [url], // The API expects an array of IDs/URLs
                    title: "Download from URL",
                }
            );

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

    subscribeToDownloadProgress(
        publicId: string,
        callback: (progress: number) => void
    ) {
        // Return an unsubscribe function
        // In a real implementation, we would store the callback and call it when progress updates come in
        // For now, we'll return a simple unsubscribe function
        console.log(`Subscribing to download progress for ${publicId}`);

        // We'll use the event manager to listen for progress updates
        const handler = (data: {
            publicId: string;
            completed: number;
            message: string;
        }) => {
            if (data.publicId === publicId) {
                callback(data.completed);
            }
        };

        rockIt.eventManager.addEventListener(
            EEvent.MediaDownloadStatus,
            handler
        );

        return () => {
            rockIt.eventManager.removeEventListener(
                EEvent.MediaDownloadStatus,
                handler
            );
        };
    }

    async downloadMediaAsync(publicIds: string[]) {
        const response = await apiPostFetch(
            "/downloads/start",
            StartDownloadRequestSchema,
            StartDownloadResponseSchema,
            {
                ids: publicIds,
                title: "Download",
            }
        );

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

    updateDownloadProgress(data: DownloadProgressMessage) {
        console.log(data);
        // Map the data to our DownloadInfo format
        const downloadInfo: DownloadInfo = {
            publicId: data.publicId,
            message: data.message,
            completed: data.progress,
            status:
                data.progress === 100
                    ? EDownloadInfoStatus.Completed
                    : data.progress === -1
                      ? EDownloadInfoStatus.Failed
                      : EDownloadInfoStatus.Downloading,
        };

        // Update or add the download info
        this._downloadInfoAtom.set(
            this._downloadInfoAtom
                .get()
                .map((item) =>
                    item.publicId === data.publicId ? downloadInfo : item
                )
                .filter((item) => item.publicId !== data.publicId)
                .concat(downloadInfo)
        );

        if (data.status === EDownloadInfoStatus.Completed) {
            rockIt.eventManager.dispatchEvent(EEvent.MediaDownloaded, {
                publicId: data.publicId,
            });
        }
        rockIt.eventManager.dispatchEvent(EEvent.MediaDownloadStatus, {
            publicId: data.publicId,
            completed: data.progress,
            message: data.message,
        });
    }
}
