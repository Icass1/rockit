import {
    DownloadProgressMessage,
    EWebSocketMessage,
    StartDownloadRequest,
} from "@rockit/shared";
import { EDownloadInfoStatus } from "@/models/enums/downloadInfoStatus";
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
        const response = await apiPostFetch<StartDownloadRequest>(
            "/downloader/start-downloads",
            {
                ids: publicIds,
                title: "Download",
            }
        );

        if (!response?.ok) {
            rockIt.notificationManager.notifyError("Unable to start download.");
        }
    }

    // clearCompleted() {
    //     const current = this._downloadInfoAtom.get();
    //     this._downloadInfoAtom.set(current.filter((d) => d.completed < 100));
    // }

    updateDownloadProgress(data: DownloadProgressMessage) {
        console.log(data);
        // if (data.status === EDownloadInfoStatus.Done) {
        //     rockIt.eventManager.dispatchEvent(EEvent.MediaDownloaded, {
        //         publicId,
        //     });
        // }

        // const current = this._downloadInfoAtom.get();
        // const index = current.findIndex((d) => d.publicId === publicId);
        // if (index !== -1) {
        //     const updated = [...current];
        //     updated[index] = { publicId, completed, message, status };
        //     this._downloadInfoAtom.set(updated);
        //     if (status === EDownloadInfoStatus.Done) {
        //         rockIt.eventManager.dispatchEvent(EEvent.MediaDownloaded, {
        //             publicId,
        //         });
        //     }
        // }
    }

    // get downloadInfoAtom() {
    //     return this._downloadInfoAtom.getReadonlyAtom();
    // }
}
