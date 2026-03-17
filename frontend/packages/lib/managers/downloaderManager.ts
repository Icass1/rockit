import { StartDownloadRequest } from "@/packages/dto";
import {
    RESPONSE_UNDEFINED_MESSAGE,
    rockIt,
} from "@/packages/lib/rockit/rockIt";
import { createArrayAtom } from "@/packages/lib/store";
import { apiPostFetch } from "@/packages/lib/utils/apiFetch";
import { DBListType, DownloadInfo } from "@/packages/types/rockIt";

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

    // #endregion

    // #region: Methods

    async downloadMediaToDBAsync(publicIds: string[]) {
        const response = await apiPostFetch<StartDownloadRequest>(
            "/downloader/start-downloads",
            {
                ids: publicIds,
                title: "Download 1",
            }
        );

        if (!response) {
            rockIt.notificationManager.notifyError(RESPONSE_UNDEFINED_MESSAGE);
            return;
        }
        if (!response.ok) {
            rockIt.notificationManager.notifyError("Unable to start download.");
            return;
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
