import { createArrayAtom } from "@/lib/store";
import apiFetch from "@/lib/utils/apiFetch";
import { RESPONSE_UNDEFINED_MESSAGE, rockIt } from "@/lib/rockit/rockIt";
import { StartDownloadResponse } from "@/responses/startDownloadResponse";
import { DownloadStatusMessage } from "@/responses/downloadStatusMessage";

interface SongStatus {
    publicId: string;
    message: string;
    completed: number;
}

export class DownloaderManager {
    // #region: Atoms

    private _downloadedListsAtom = createArrayAtom<string>([]);
    private _downloadedSongsAtom = createArrayAtom<string>([]);
    private _downloadingListsAtom = createArrayAtom<string>([]);
    private _downloadingSongsAtom = createArrayAtom<string>([]);
    private _downloadingSongsStatusAtom = createArrayAtom<SongStatus>([]);

    // #endregion: Getters

    // #region: Constructor

    constructor() {}

    // #endregion

    // #region: Methods

    async downloadSpotifyListToDBAsync(
        type: "album" | "playlist",
        publicId: string
    ) {
        const url = `https://open.spotify.com/${type}/${publicId}`;

        console.log("(downloadSpotifyListToDBAsync)", url);

        const response = await apiFetch(
            `/downloader/start-download?user=1&url=${url}`
        );

        if (!response) {
            rockIt.notificationManager.notifyError(RESPONSE_UNDEFINED_MESSAGE);
            return;
        }
        if (!response.ok) {
            rockIt.notificationManager.notifyError("Unable to start download.");
            return;
        }

        const responseJson = await response.json();
        const startDownload = StartDownloadResponse.parse(responseJson);

        const eventSource = new EventSource(
            `${rockIt.BACKEND_URL}/downloader/download-status?id=${startDownload.downloadId}`
        );

        eventSource.onerror = (ev: Event) => {
            this.handleEventSourceError(eventSource, ev);
        };

        eventSource.onmessage = (ev: MessageEvent) => {
            this.handleEventSourceMessage(eventSource, ev);
        };

        eventSource.onopen = (ev: Event) => {
            this.handleEventSourceOpen(eventSource, ev);
        };
    }

    async downloadSpotifySongToDBAsync(publicId: string) {
        const url = `https://open.spotify.com/track/${publicId}`;

        console.log("(downloadSpotifySongToDBAsync)", url);

        const response = await apiFetch(
            `/downloader/start-download?user=1&url=${url}`
        );

        if (!response) {
            rockIt.notificationManager.notifyError(RESPONSE_UNDEFINED_MESSAGE);
            return;
        }
        if (!response.ok) {
            rockIt.notificationManager.notifyError("Unable to start download.");
            return;
        }

        const responseJson = await response.json();
        const startDownload = StartDownloadResponse.parse(responseJson);

        const eventSource = new EventSource(
            `${rockIt.BACKEND_URL}/downloader/download-status?id=${startDownload.downloadId}`
        );

        eventSource.onerror = (ev: Event) => {
            this.handleEventSourceError(eventSource, ev);
        };

        eventSource.onmessage = (ev: MessageEvent) => {
            this.handleEventSourceMessage(eventSource, ev);
        };

        eventSource.onopen = (ev: Event) => {
            this.handleEventSourceOpen(eventSource, ev);
        };
    }

    // #endregion: Methods

    // #region: Handlers

    private handleEventSourceError(eventSource: EventSource, ev: Event) {
        eventSource.close();
        console.log(`Error in ${eventSource.url} ${ev}`);
    }

    private handleEventSourceMessage(
        eventSource: EventSource,
        ev: MessageEvent
    ) {
        try {
            const data = DownloadStatusMessage.parse(JSON.parse(ev.data));
            if (data.completed == 100) {
                console.log("Song downloaded", data.id);
            }

            this._downloadingSongsStatusAtom.push({
                publicId: data.id,
                completed: data.completed,
                message: data.message,
            });

            // this._downloadingSongsStatusAtom.set([
            //     ...this._downloadingSongsStatusAtom.get(),
            //     {
            //         publicId: data.id,
            //         completed: data.completed,
            //         message: data.message,
            //     },
            // ]);
        } catch (error) {
            console.error(error);
            console.error(`Error parsing message '${ev.data}'`);
        }
    }

    private handleEventSourceOpen(eventSource: EventSource, ev: Event) {
        console.log(`Event source open ${eventSource.url} ${ev}`);
    }

    // #endregion: Handlers

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

    // #endregion: Getters
}
