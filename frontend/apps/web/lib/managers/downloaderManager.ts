import type {
    DownloadGroupResponse,
    DownloadItemResponse,
    DownloadProgressMessage,
} from "@/dto";
import {
    BaseSearchResultsItem,
    EEvent,
    EWebSocketMessage,
    isPlayable,
    isQueueable,
} from "@rockit/shared";
import { EDownloadInfoStatus } from "@/models/enums/downloadInfoStatus";
import { IMediaDownloadedEvent } from "@/models/interfaces/events/mediaDownloaded";
import { Http } from "@/lib/http";
import { rockIt } from "@/lib/rockit/rockIt";
import { ArrayAtom, createArrayAtom, createAtom } from "@/lib/store";

export interface DownloadInfo {
    publicId: string;
    message: string;
    completed: number;
    status: EDownloadInfoStatus;
}

export class DownloaderManager {
    private _downloadInfoAtom = createArrayAtom<DownloadInfo>([]);
    private _initialized = false;
    readonly groupsAtom = createAtom<DownloadGroupResponse[]>([]);
    readonly loadingAtom = createAtom(true);
    readonly errorAtom = createAtom<string | null>(null);
    readonly pendingAtom = createAtom<Record<string, string>>({});
    private progress = new Map<string, Partial<DownloadItemResponse>>();
    private removed = new Set<string>();
    private refreshing: Promise<void> | null = null;
    private sessionVersion = 0;
    private refreshTimer: ReturnType<typeof setTimeout> | undefined;

    reset(): void {
        this.sessionVersion++;
        this.refreshing = null;
        if (this.refreshTimer) clearTimeout(this.refreshTimer);
        this.refreshTimer = undefined;
        this.progress.clear();
        this.removed.clear();
        this.groupsAtom.set([]);
        this.pendingAtom.set({});
        this.loadingAtom.set(true);
        this.errorAtom.set(null);
    }

    async refreshAsync(): Promise<void> {
        if (this.refreshing) return this.refreshing;
        const version = this.sessionVersion;
        this.progress.clear();
        const request = (async () => {
            try {
                const result = await Http.getDownloads();
                if (version !== this.sessionVersion) return;
                if (!result.isOk()) throw new Error(result.message);
                this.groupsAtom.set(
                    result.result.downloads.map((group) => ({
                        ...group,
                        items: group.items
                            .filter((item) => !this.removed.has(item.publicId))
                            .map((item) => ({
                                ...item,
                                ...this.progress.get(item.publicId),
                            })),
                    }))
                );
                this.errorAtom.set(null);
            } catch (error) {
                if (version !== this.sessionVersion) return;
                this.errorAtom.set(
                    error instanceof Error
                        ? error.message
                        : rockIt.vocabularyManager.vocabulary
                              .ERROR_GETTING_DOWNLOADS
                );
            } finally {
                if (version === this.sessionVersion)
                    this.loadingAtom.set(false);
            }
        })();
        this.refreshing = request;
        try {
            await request;
        } finally {
            if (this.refreshing === request) this.refreshing = null;
        }
    }

    private receiveProgress(data: DownloadProgressMessage): void {
        this.progress.set(data.publicId, data);
        const known = this.groupsAtom
            .get()
            .some((group) =>
                group.items.some((item) => item.publicId === data.publicId)
            );
        if (known) {
            this.groupsAtom.set(
                this.groupsAtom.get().map((group) => ({
                    ...group,
                    items: group.items.map((item) =>
                        item.publicId === data.publicId
                            ? { ...item, ...data }
                            : item
                    ),
                }))
            );
        } else if (!this.refreshTimer && !this.removed.has(data.publicId)) {
            this.refreshTimer = setTimeout(() => {
                this.refreshTimer = undefined;
                void this.refreshAsync();
            }, 500);
        }
    }

    async runActionAsync(
        item: DownloadItemResponse,
        action: "delete" | "retry" | "library" | "playlist",
        playlistId?: string
    ): Promise<void> {
        if (this.pendingAtom.get()[item.publicId]) return;
        this.pendingAtom.set({
            ...this.pendingAtom.get(),
            [item.publicId]: action,
        });
        const original = item;
        const originalGroup = this.groupsAtom
            .get()
            .find((group) =>
                group.items.some((entry) => entry.publicId === item.publicId)
            );
        const originalIndex =
            originalGroup?.items.findIndex(
                (entry) => entry.publicId === item.publicId
            ) ?? 0;
        if (action === "delete") {
            this.removed.add(item.publicId);
            this.groupsAtom.set(
                this.groupsAtom.get().map((group) => ({
                    ...group,
                    items: group.items.filter(
                        (entry) => entry.publicId !== item.publicId
                    ),
                }))
            );
        }
        if (action === "retry") {
            this.progress.delete(item.publicId);
            this.groupsAtom.set(
                this.groupsAtom.get().map((group) => ({
                    ...group,
                    items: group.items.map((entry) =>
                        entry.publicId === item.publicId
                            ? {
                                  ...entry,
                                  status: "PENDING",
                                  progress: 0,
                                  retryCount: 0,
                              }
                            : entry
                    ),
                }))
            );
        }
        try {
            const result =
                action === "delete"
                    ? await Http.deleteDownload(item.publicId)
                    : action === "retry"
                      ? await Http.retryDownload(item.publicId)
                      : action === "playlist" && playlistId
                        ? await Http.addMediaToPlaylistAsync(playlistId, {
                              mediaPublicId: item.mediaPublicId,
                          })
                        : await Http.addMediaToLibrary(item.mediaPublicId);
            if (!result.isOk()) throw new Error(result.message);
            rockIt.notificationManager.notifySuccess(
                action === "delete"
                    ? rockIt.vocabularyManager.vocabulary.DELETE_SUCCESS
                    : action === "retry"
                      ? rockIt.vocabularyManager.vocabulary.DOWNLOAD_STARTED
                      : action === "playlist"
                        ? rockIt.vocabularyManager.vocabulary.ADDED_TO_PLAYLIST
                        : rockIt.vocabularyManager.vocabulary.ADDED_TO_LIBRARY
            );
        } catch (error) {
            this.removed.delete(item.publicId);
            if (action === "delete" && originalGroup) {
                this.groupsAtom.set(
                    this.groupsAtom.get().map((group) => {
                        if (
                            group.publicId !== originalGroup.publicId ||
                            group.items.some(
                                (entry) => entry.publicId === item.publicId
                            )
                        )
                            return group;
                        const items = [...group.items];
                        items.splice(originalIndex, 0, original);
                        return { ...group, items };
                    })
                );
            }
            if (action === "retry")
                this.groupsAtom.set(
                    this.groupsAtom.get().map((group) => ({
                        ...group,
                        items: group.items.map((entry) =>
                            entry.publicId === item.publicId ? original : entry
                        ),
                    }))
                );
            rockIt.notificationManager.notifyError(
                error instanceof Error
                    ? error.message
                    : rockIt.vocabularyManager.vocabulary.ERROR
            );
            await this.refreshAsync();
        } finally {
            const pending = { ...this.pendingAtom.get() };
            delete pending[item.publicId];
            this.pendingAtom.set(pending);
        }
    }

    async addGroupToLibraryAsync(publicId: string): Promise<void> {
        const result = await Http.addMediaToLibrary(publicId);
        if (!result.isOk()) throw new Error(result.message);
        rockIt.notificationManager.notifySuccess(
            rockIt.vocabularyManager.vocabulary.ADDED_TO_LIBRARY
        );
    }

    async init(): Promise<void> {
        if (this._initialized) {
            return;
        }

        rockIt.webSocketManager.onMessage(
            EWebSocketMessage.DownloadProgress,
            (data) => {
                this.receiveProgress(data);
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

    async downloadSearchResultAndPlayAsync(
        searchItem: BaseSearchResultsItem
    ): Promise<void> {
        const result = await Http.startDownloadFromUrl({
            url: searchItem.providerUrl,
            addToPlaylist: false,
            addToLibrary: false,
            playlistPublicId: null,
        });

        if (!result.isOk()) {
            rockIt.notificationManager.notifyError(result.message);
            console.error(
                "Error starting download from URL",
                result.message,
                result.detail
            );
            return;
        }

        rockIt.notificationManager.notifySuccess(
            rockIt.vocabularyManager.vocabulary.DOWNLOAD_STARTED
        );

        const publicId = result.result.data.publicId;

        const handleDownloaded = (data: IMediaDownloadedEvent): void => {
            if (data.publicId !== publicId) return;

            rockIt.eventManager.removeEventListener(
                EEvent.MediaDownloaded,
                handleDownloaded
            );

            rockIt.mediaManager.getMedia(publicId).then((mediaResult): void => {
                if (!mediaResult.isOk()) {
                    console.error(
                        "Error getting downloaded media",
                        mediaResult.message,
                        mediaResult.detail
                    );
                    return;
                }

                const song = mediaResult.result.media;
                if (!isQueueable(song) || !isPlayable(song)) return;

                rockIt.queueManager.setMedia([song], song.publicId);
                rockIt.queueManager.moveToMedia(song.publicId);
                rockIt.mediaPlayerManager.play();
            });
        };

        rockIt.eventManager.addEventListener(
            EEvent.MediaDownloaded,
            handleDownloaded
        );
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
