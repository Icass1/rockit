import { atom } from "nanostores";
import apiFetch from "@/lib/utils/apiFetch";
import { RESPONSE_UNDEFINED_MESSAGE, rockIt } from "@/lib/rockit";
import { StartDownloadResponse } from "@/responses/startDownloadResponse";
import { DownloadStatusMessage } from "@/responses/downloadStatusMessage";

interface SongStatus {
    publicId: string;
    message: string;
    completed: number;
}

export class DownloaderManager {
    // #region: Atoms

    private _downloadedListsAtom = atom<string[]>([]);
    private _downloadedSongsAtom = atom<string[]>([]);
    private _downloadingSongsStatusAtom = atom<SongStatus[]>([]);

    // #endregion: Getters

    // #region: Constructor

    constructor() {}

    // #endregion

    // #region: Methods

    async downloadListToDBAsync(type: "album" | "playlist", publicId: string) {
        const url = `https://open.spotify.com/${type}/${publicId}`;

        console.log("(downloadListToDBAsync)", url);

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

        console.log(startDownload.downloadId);

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
            this._downloadingSongsStatusAtom.set([
                ...this._downloadingSongsStatusAtom.get(),
                {
                    publicId: data.id,
                    completed: data.completed,
                    message: data.message,
                },
            ]);
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
        return this._downloadedListsAtom;
    }

    get downloadedSongsAtom() {
        return this._downloadedSongsAtom;
    }

    get downloadingSongsStatusAtom() {
        return this._downloadingSongsStatusAtom;
    }

    // #endregion: Getters
}
