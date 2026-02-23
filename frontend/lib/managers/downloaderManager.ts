import { createArrayAtom } from "@/lib/store";
import apiFetch from "@/lib/utils/apiFetch";
import { RESPONSE_UNDEFINED_MESSAGE, rockIt } from "@/lib/rockit/rockIt";
import { StartDownloadResponse } from "@/dto/startDownloadResponse";
import { DownloadStatusMessage } from "@/dto/downloadStatusMessage";
import { DBListType, DownloadInfo } from "@/types/rockIt";
import { DownloadsResponse } from "@/dto/downloadsResponse";
import { RockItSongWithAlbum } from "../rockit/rockItSongWithAlbum";
import { RockItSongWithoutAlbum } from "../rockit/rockItSongWithoutAlbum";
import { RockItSongPlaylist } from "../rockit/rockItSongPlaylist";

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

    init() {
        return;
        if (typeof window == "undefined") {
            return;
        }
        const type = "playlist";
        const publicId = "7h6r9ScqSjCHH3QozfBdIq";
        const downloadId = "IMZPc5DVyEq3sBwN";

        this._downloadingListsAtom.push({ type, publicId });

        const eventSource = new EventSource(
            `${rockIt.BACKEND_URL}/downloader/download-status?id=${downloadId}`
        );

        eventSource.onerror = (ev: Event) => {
            this.handleEventSourceError(eventSource, ev, () => {
                const index = this._downloadingListsAtom
                    .getReadonlyAtom()
                    .findIndex(
                        (item) => item.publicId == publicId && item.type == type
                    );

                this._downloadingListsAtom.splice(index, 1);
            });
        };

        eventSource.onmessage = (ev: MessageEvent) => {
            this.handleEventSourceMessage(eventSource, ev);
        };

        eventSource.onopen = (ev: Event) => {
            this.handleEventSourceOpen(eventSource, ev);
        };
    }

    // #endregion

    // #region: Methods

    async downloadSpotifyListToDBAsync(type: DBListType, publicId: string) {
        const url = `https://open.spotify.com/${type}/${publicId}`;

        // console.log("(downloadSpotifyListToDBAsync)", url);

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

        this._downloadingListsAtom.push({ type, publicId });

        const eventSource = new EventSource(
            `${rockIt.BACKEND_URL}/downloader/download-status?id=${startDownload.downloadId}`
        );

        eventSource.onerror = (ev: Event) => {
            this.handleEventSourceError(eventSource, ev, () => {
                const index = this._downloadingListsAtom
                    .getReadonlyAtom()
                    .findIndex(
                        (item) => item.publicId == publicId && item.type == type
                    );

                this._downloadingListsAtom.splice(index, 1);
            });
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

        // console.log("(downloadSpotifySongToDBAsync)", url);

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

    private async handleSpotifySongDownloaded(publicId: string) {
        // console.log("(handleSpotifySongDownloaded)", { publicId });

        await RockItSongWithAlbum.getExistingInstanceFromPublicId(
            publicId
        )?.updateAsync();
        await RockItSongWithoutAlbum.getExistingInstanceFromPublicId(
            publicId
        )?.updateAsync();
        await RockItSongPlaylist.getExistingInstanceFromPublicId(
            publicId
        )?.updateAsync();
    }

    // #endregion: Methods

    // #region: Handlers

    private handleEventSourceError(
        eventSource: EventSource,
        ev: Event,
        onEnd?: () => void
    ) {
        eventSource.close();

        if (onEnd) onEnd();
        console.log(`Error in ${eventSource.url} ${ev}`);
    }

    private handleEventSourceMessage(
        eventSource: EventSource,
        ev: MessageEvent
    ) {
        try {
            const data = DownloadStatusMessage.parse(JSON.parse(ev.data));
            // console.log(data);
            if (data.completed == 100 && data.message != "Skipped") {
                console.log("Song downloaded", data.id, data.message);
                this.handleSpotifySongDownloaded(data.id);
            }

            const currentStatus = this._downloadingSongsStatusAtom.get();
            const index = currentStatus.findIndex(
                (song) => song.publicId == data.id
            );

            if (index == -1) {
                currentStatus.push({
                    publicId: data.id,
                    completed: data.completed,
                    message: data.message,
                });
            } else {
                currentStatus[index] = {
                    publicId: data.id,
                    completed: data.completed,
                    message: data.message,
                };
            }
            this._downloadingSongsStatusAtom.set(currentStatus);
        } catch (error) {
            console.error(error);
            console.error(`Error parsing message '${ev.data}'`);
        }
    }

    private handleEventSourceOpen(eventSource: EventSource, ev: Event) {
        console.log(`Event source open ${eventSource.url} ${ev}`);
    }

    async getDownloadsAsync(): Promise<DownloadsResponse> {
        throw "(getDownloadsAsync) Method not implemented.";
        return DownloadsResponse.parse([]);
    }
    async startDownloadAsync(url: string) {
        console.log(url);
        throw "(startDownloadAsync) Method not implemented.";
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

    get downloadInfoAtom() {
        return this._downloadInfoAtom.getReadonlyAtom();
    }
    // #endregion: Getters
}
