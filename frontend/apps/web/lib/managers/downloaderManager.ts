import {
    DownloadProgressMessage,
    EWebSocketMessage,
    StartDownloadRequestSchema,
    StartDownloadResponseSchema,
} from "@rockit/shared";
import { EDownloadInfoStatus } from "@/models/enums/downloadInfoStatus";
import { EEvent } from "@/models/enums/events";
import { rockIt } from "@/lib/rockit/rockIt";
import { apiPostFetch } from "@/lib/utils/apiFetch";

export interface DownloadInfo {
    publicId: string;
    message: string;
    completed: number;
    status: EDownloadInfoStatus;
}

export class DownloaderManager {
    // private _downloadInfoAtom = createArrayAtom<DownloadInfo>([]);

    async init() {
        console.log("DownloaderManager.init");
        rockIt.webSocketManager.onMessage(
            EWebSocketMessage.DownloadProgress,
            this.updateDownloadProgress.bind(this)
        );
    }

    async downloadMediaAsync(publicIds: string[]) {
        const response = await apiPostFetch(
            "/downloader/start-downloads",
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
