import { EEvent, EWebSocketMessage } from "@rockit/packages/shared";
import { EDownloadInfoStatus } from "@/models/enums/downloadInfoStatus";
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
