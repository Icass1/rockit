import { StartDownloadRequest } from "@rockit/shared";
import { rockIt } from "@/lib/rockit/rockIt";
import { createArrayAtom } from "@/lib/store";
import { apiPostFetch } from "@/lib/utils/apiFetch";

export interface DownloadInfo {
    publicId: string;
    message: string;
    completed: number;
    status: "pending" | "downloading" | "done" | "error";
}

export class DownloaderManager {
    private _downloadInfoAtom = createArrayAtom<DownloadInfo>([]);

    async downloadMediaToDBAsync(publicIds: string[]) {
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

    async startDownloadAsync(url: string) {
        const publicId = this.extractPublicId(url);
        if (!publicId) {
            rockIt.notificationManager.notifyError("Invalid URL");
            return;
        }

        this._downloadInfoAtom.push({
            publicId,
            message: "In queue",
            completed: 0,
            status: "pending",
        });

        await this.downloadMediaToDBAsync([publicId]);
    }

    clearCompleted() {
        const current = this._downloadInfoAtom.get();
        this._downloadInfoAtom.set(current.filter((d) => d.completed < 100));
    }

    updateDownloadProgress(
        publicId: string,
        completed: number,
        message: string,
        status: "pending" | "downloading" | "done" | "error"
    ) {
        const current = this._downloadInfoAtom.get();
        const index = current.findIndex((d) => d.publicId === publicId);
        if (index !== -1) {
            const updated = [...current];
            updated[index] = { publicId, completed, message, status };
            this._downloadInfoAtom.set(updated);
        }
    }

    private extractPublicId(url: string): string | null {
        const spotifyMatch = url.match(
            /spotify\.com\/(track|album|playlist)\/([a-zA-Z0-9]+)/
        );
        if (spotifyMatch)
            return `spotify:${spotifyMatch[1]}:${spotifyMatch[2]}`;

        const youtubeMatch = url.match(
            /(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/
        );
        if (youtubeMatch) return `youtube:${youtubeMatch[1]}`;

        return null;
    }

    get downloadInfoAtom() {
        return this._downloadInfoAtom.getReadonlyAtom();
    }
}
