import { StartDownloadRequest } from "@/dto";
import { DBListType, DownloadInfo } from "@/types/rockIt";
import { RESPONSE_UNDEFINED_MESSAGE, rockIt } from "@/lib/rockit/rockIt";
import { createArrayAtom } from "@/lib/store";
import { apiPostFetch } from "@/lib/utils/apiFetch";

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
