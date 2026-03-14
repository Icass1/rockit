import { StartDownloadResponseSchema, type DownloadProgressMessage } from "@/dto";
import { DBListType, DownloadInfo } from "@/types/rockIt";
import { WebSocketManager } from "@/lib/managers/webSocketManger";
import { rockIt } from "@/lib/rockit/rockIt";
import { createArrayAtom } from "@/lib/store";
import { apiFetch } from "@/lib/utils/apiFetch";

interface SongStatus {
    publicId: string;
    message: string;
    completed: number;
}

export class DownloaderManager {
    // #region: Atoms

    private _downloadedListsAtom = createArrayAtom<string>([]);
    private _downloadedSongsAtom = createArrayAtom<string>([]);
    private _downloadingListsAtom = createArrayAtom<{
        type: DBListType;
        publicId: string;
    }>([]);
    private _downloadingSongsAtom = createArrayAtom<string>([]);
    private _downloadingSongsStatusAtom = createArrayAtom<SongStatus>([]);
    private _downloadInfoAtom = createArrayAtom<DownloadInfo>([]);

    // #endregion: Getters

    // #region: Constructor

    constructor() {}

    init(webSocketManager: WebSocketManager) {
        webSocketManager.init();

        webSocketManager.onMessage("download_progress", (msg: DownloadProgressMessage) => {
            const download = msg as unknown as DownloadProgressMessage;
            this.updateDownloadProgress(download.public_id, download.status, download.progress, download.message);
        });
    }

    private updateDownloadProgress(publicId: string, status: string, progress: number, message: string) {
        const current = this._downloadInfoAtom.get();
        const index = current.findIndex((d) => d.publicId === publicId);

        if (index === -1) {
            return;
        }

        const updated = [...current];
        updated[index] = {
            ...updated[index],
            status: status === "error" ? "error" : status === "completed" ? "completed" : "downloading",
            completed: progress,
            message: message,
        };

        this._downloadInfoAtom.set(updated);
    }

    // #endregion

    // #region: Methods

    async downloadMediaToDBAsync(publicIds: string[]) {
        try {
            await apiFetch(
                "/downloader/start-downloads",
                StartDownloadResponseSchema,
                {
                    method: "POST",
                    body: JSON.stringify({
                        ids: publicIds,
                        title: "Download 1",
                    }),
                    headers: { "Content-Type": "application/json" },
                }
            );
        } catch {
            rockIt.notificationManager.notifyError("Unable to start download.");
        }
    }

    async startDownloadAsync(url: string) {
        const publicId = this.extractPublicId(url);
        if (!publicId) {
            rockIt.notificationManager.notifyError("Invalid URL");
            return;
        }

        this._downloadInfoAtom.set([
            ...this._downloadInfoAtom.get(),
            {
                publicId,
                message: "In queue",
                completed: 0,
                selected: false,
                status: "pending",
            },
        ]);

        await this.downloadMediaToDBAsync([publicId]);
    }

    clearCompleted() {
        const current = this._downloadInfoAtom.get();
        const active = current.filter((d) => d.completed < 100);
        this._downloadInfoAtom.set(active);
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

    // #endregion: Methods

    // #region: Getters

    get downloadedListsAtom() {
        return this._downloadedListsAtom.getReadonlyAtom();
    }

    get downloadedSongsAtom() {
        return this._downloadedSongsAtom.getReadonlyAtom();
    }

    get downloadingSongsStatusAtom() {
        return this._downloadingSongsStatusAtom.getReadonlyAtom();
    }

    get downloadingListsAtom() {
        return this._downloadingListsAtom.getReadonlyAtom();
    }

    get downloadingSongsAtom() {
        return this._downloadingSongsAtom.getReadonlyAtom();
    }

    get downloadInfoAtom() {
        return this._downloadInfoAtom.getReadonlyAtom();
    }
    // #endregion: Getters
}
