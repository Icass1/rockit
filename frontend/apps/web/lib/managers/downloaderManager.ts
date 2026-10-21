import type {
    DownloadBrowseGroupResponse,
    DownloadItemResponse,
    DownloadProgressMessage,
    DownloadTotalsResponse,
} from "@/dto";
import {
    BaseSearchResultsItem,
    EEvent,
    EWebSocketMessage,
    isPlayable,
    isQueueable,
} from "@rockit/shared";
import { EDownloadInfoStatus } from "@/models/enums/downloadInfoStatus";
import { ENotificationType } from "@/models/enums/notificationType";
import { IMediaDownloadedEvent } from "@/models/interfaces/events/mediaDownloaded";
import type {
    DownloadDetail,
    DownloadView,
} from "@/models/types/downloadBrowser";
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
    readonly groupsAtom = createAtom<DownloadBrowseGroupResponse[]>([]);
    readonly totalsAtom = createAtom<DownloadTotalsResponse>({
        total: 0,
        active: 0,
        completed: 0,
        failed: 0,
        daily: [],
    });
    readonly viewAtom = createAtom<DownloadView>({
        page: 0,
        status: "all",
        kind: "all",
        query: "",
    });
    readonly hasMoreAtom = createAtom(false);
    readonly detailAtom = createAtom<DownloadDetail | null>(null);
    readonly loadingAtom = createAtom(true);
    readonly refreshingAtom = createAtom(false);
    readonly errorAtom = createAtom<string | null>(null);
    readonly pendingAtom = createAtom<Record<string, string>>({});
    readonly groupPendingAtom = createAtom<Record<string, string>>({});
    private progress = new Map<string, DownloadProgressMessage>();
    private pendingProgress = new Map<string, DownloadProgressMessage>();
    private removed = new Set<string>();
    private removedGroups = new Set<string>();
    private refreshing: Promise<void> | null = null;
    private version = 0;
    private sessionVersion = 0;
    private detailVersion = 0;
    private watchers = 0;
    private refreshTimer: ReturnType<typeof setTimeout> | undefined;
    private progressTimer: ReturnType<typeof setTimeout> | undefined;

    watch(): () => void {
        this.watchers++;
        void this.refreshAsync();
        return () => {
            this.watchers = Math.max(0, this.watchers - 1);
        };
    }

    reset(): void {
        this.sessionVersion++;
        this.version++;
        this.detailVersion++;
        this.refreshing = null;
        if (this.refreshTimer) clearTimeout(this.refreshTimer);
        if (this.progressTimer) clearTimeout(this.progressTimer);
        this.refreshTimer = this.progressTimer = undefined;
        this.progress.clear();
        this.pendingProgress.clear();
        this.removed.clear();
        this.removedGroups.clear();
        this.groupsAtom.set([]);
        this.pendingAtom.set({});
        this.groupPendingAtom.set({});
        this.detailAtom.set(null);
        this.totalsAtom.set({
            total: 0,
            active: 0,
            completed: 0,
            failed: 0,
            daily: [],
        });
        this.viewAtom.set({ page: 0, status: "all", kind: "all", query: "" });
        this.loadingAtom.set(true);
        this.refreshingAtom.set(false);
        this.errorAtom.set(null);
    }

    async setViewAsync(options: Partial<DownloadView>): Promise<void> {
        this.viewAtom.set({ ...this.viewAtom.get(), page: 0, ...options });
        this.version++;
        this.detailVersion++;
        this.refreshing = null;
        this.detailAtom.set(null);
        await this.refreshAsync();
    }

    async refreshAsync(): Promise<void> {
        if (this.refreshing) return this.refreshing;
        const version = this.version;
        const view = this.viewAtom.get();
        this.refreshingAtom.set(true);
        this.progress.clear();
        this.pendingProgress.clear();
        const request = (async () => {
            try {
                const result = await Http.browseDownloads(
                    view.page,
                    view.status,
                    view.kind,
                    view.query
                );
                if (version !== this.version) return;
                if (!result.isOk()) throw new Error(result.message);
                this.groupsAtom.set(
                    result.result.groups
                        .filter(
                            (group) => !this.removedGroups.has(group.publicId)
                        )
                        .map((group) => ({
                            ...group,
                            items: group.items
                                .filter(
                                    (item) => !this.removed.has(item.publicId)
                                )
                                .map((item) =>
                                    this.progress.has(item.publicId)
                                        ? {
                                              ...item,
                                              ...this.progress.get(
                                                  item.publicId
                                              ),
                                          }
                                        : item
                                ),
                        }))
                );
                this.totalsAtom.set(result.result.totals);
                this.hasMoreAtom.set(result.result.hasMore);
                this.errorAtom.set(null);
            } catch (error) {
                if (version === this.version)
                    this.errorAtom.set(
                        error instanceof Error
                            ? error.message
                            : rockIt.vocabularyManager.vocabulary
                                  .ERROR_GETTING_DOWNLOADS
                    );
            } finally {
                if (version === this.version) {
                    this.loadingAtom.set(false);
                    this.refreshingAtom.set(false);
                }
            }
        })();
        this.refreshing = request;
        try {
            await request;
        } finally {
            if (this.refreshing === request) this.refreshing = null;
        }
    }

    async openGroupAsync(groupId: string, offset = 0): Promise<void> {
        const token = ++this.detailVersion;
        const status = this.viewAtom.get().status;
        this.detailAtom.set({
            groupId,
            offset,
            items: [],
            loading: true,
            error: null,
            hasMore: false,
        });
        try {
            const result = await Http.getDownloadGroupItems(
                groupId,
                offset,
                status,
                this.viewAtom.get().query
            );
            if (token !== this.detailVersion) return;
            if (!result.isOk()) throw new Error(result.message);
            this.detailAtom.set({
                groupId,
                offset,
                items: result.result.items.map((item) =>
                    this.progress.has(item.publicId)
                        ? { ...item, ...this.progress.get(item.publicId) }
                        : item
                ),
                loading: false,
                error: null,
                hasMore: result.result.hasMore,
            });
        } catch (error) {
            if (token === this.detailVersion)
                this.detailAtom.set({
                    groupId,
                    offset,
                    items: [],
                    loading: false,
                    error:
                        error instanceof Error
                            ? error.message
                            : rockIt.vocabularyManager.vocabulary.ERROR,
                    hasMore: false,
                });
        }
    }

    closeGroup(): void {
        this.detailVersion++;
        this.detailAtom.set(null);
    }

    private reconcileSoon(): void {
        if (this.watchers && !this.refreshTimer)
            this.refreshTimer = setTimeout(() => {
                this.refreshTimer = undefined;
                if (this.watchers) void this.refreshAsync();
            }, 1500);
    }

    private receiveProgress(data: DownloadProgressMessage): void {
        const detail = this.detailAtom.get();
        const known =
            this.groupsAtom
                .get()
                .some((group) =>
                    group.items.some((item) => item.publicId === data.publicId)
                ) ||
            detail?.items.some((item) => item.publicId === data.publicId);
        if (known) {
            this.progress.set(data.publicId, data);
            this.pendingProgress.set(data.publicId, data);
            if (!this.progressTimer)
                this.progressTimer = setTimeout(() => {
                    this.progressTimer = undefined;
                    const messages = new Map(this.pendingProgress);
                    this.pendingProgress.clear();
                    this.groupsAtom.set(
                        this.groupsAtom.get().map((group) => {
                            if (
                                !group.items.some((item) =>
                                    messages.has(item.publicId)
                                )
                            )
                                return group;
                            return {
                                ...group,
                                items: group.items.map((item) =>
                                    messages.has(item.publicId)
                                        ? {
                                              ...item,
                                              ...messages.get(item.publicId),
                                          }
                                        : item
                                ),
                            };
                        })
                    );
                    const current = this.detailAtom.get();
                    if (
                        current &&
                        current.items.some((item) =>
                            messages.has(item.publicId)
                        )
                    )
                        this.detailAtom.set({
                            ...current,
                            items: current.items.map((item) =>
                                messages.has(item.publicId)
                                    ? {
                                          ...item,
                                          ...messages.get(item.publicId),
                                      }
                                    : item
                            ),
                        });
                }, 100);
        }
        if (!known || data.status === "COMPLETED" || data.status === "FAILED")
            this.reconcileSoon();
    }

    private updateItem(
        id: string,
        update: (item: DownloadItemResponse) => DownloadItemResponse | null
    ): void {
        const apply = (items: DownloadItemResponse[]): DownloadItemResponse[] =>
            items.flatMap((item) =>
                item.publicId === id ? (update(item) ?? []) : item
            );
        this.groupsAtom.set(
            this.groupsAtom
                .get()
                .map((group) =>
                    group.items.some((item) => item.publicId === id)
                        ? { ...group, items: apply(group.items) }
                        : group
                )
        );
        const detail = this.detailAtom.get();
        if (detail?.items.some((item) => item.publicId === id))
            this.detailAtom.set({ ...detail, items: apply(detail.items) });
    }

    async runActionAsync(
        item: DownloadItemResponse,
        action: "delete" | "retry" | "library" | "playlist",
        playlistId?: string
    ): Promise<void> {
        const sessionVersion = this.sessionVersion;
        if (this.pendingAtom.get()[item.publicId]) return;
        this.pendingAtom.set({
            ...this.pendingAtom.get(),
            [item.publicId]: action,
        });
        const originalGroup = this.groupsAtom
            .get()
            .find((group) =>
                group.items.some((entry) => entry.publicId === item.publicId)
            );
        const originalDetail = this.detailAtom.get();
        if (action === "delete") {
            this.removed.add(item.publicId);
            this.updateItem(item.publicId, () => null);
        }
        if (action === "retry") {
            this.progress.delete(item.publicId);
            this.updateItem(item.publicId, (entry) => ({
                ...entry,
                status: "PENDING",
                progress: 0,
                retryCount: 0,
            }));
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
            if (sessionVersion !== this.sessionVersion) return;
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
            if (action === "delete") {
                await this.refreshAsync();
                const detail = this.detailAtom.get();
                if (detail && detail.groupId === originalDetail?.groupId)
                    await this.openGroupAsync(detail.groupId, detail.offset);
            } else if (action === "retry") this.reconcileSoon();
        } catch (error) {
            if (sessionVersion !== this.sessionVersion) return;
            this.removed.delete(item.publicId);
            if (action === "delete" && originalGroup)
                this.groupsAtom.set(
                    this.groupsAtom.get().map((group) =>
                        group.publicId === originalGroup.publicId
                            ? {
                                  ...group,
                                  items: originalGroup.items.map(
                                      (entry) =>
                                          group.items.find(
                                              (current) =>
                                                  current.publicId ===
                                                  entry.publicId
                                          ) ?? entry
                                  ),
                              }
                            : group
                    )
                );
            if (
                action === "delete" &&
                originalDetail &&
                this.detailAtom.get()?.groupId === originalDetail.groupId
            )
                this.detailAtom.set(originalDetail);
            if (action === "retry") this.updateItem(item.publicId, () => item);
            rockIt.notificationManager.notifyError(
                error instanceof Error
                    ? error.message
                    : rockIt.vocabularyManager.vocabulary.ERROR
            );
        } finally {
            if (sessionVersion === this.sessionVersion) {
                const pending = { ...this.pendingAtom.get() };
                delete pending[item.publicId];
                this.pendingAtom.set(pending);
            }
        }
    }

    async runGroupActionAsync(
        group: DownloadBrowseGroupResponse,
        action: "delete" | "retry" | "library"
    ): Promise<void> {
        const sessionVersion = this.sessionVersion;
        if (this.groupPendingAtom.get()[group.publicId]) return;
        this.groupPendingAtom.set({
            ...this.groupPendingAtom.get(),
            [group.publicId]: action,
        });
        const originalDetail = this.detailAtom.get();
        if (action === "delete") {
            this.removedGroups.add(group.publicId);
            this.groupsAtom.set(
                this.groupsAtom
                    .get()
                    .filter((entry) => entry.publicId !== group.publicId)
            );
            if (originalDetail?.groupId === group.publicId) this.closeGroup();
        }
        if (action === "retry" && originalDetail?.groupId === group.publicId) {
            this.detailAtom.set({
                ...originalDetail,
                items: originalDetail.items.map((item) => ({
                    ...item,
                    status: "PENDING",
                    progress: 0,
                    retryCount: 0,
                })),
            });
        }
        if (action === "retry")
            this.groupsAtom.set(
                this.groupsAtom.get().map((entry) =>
                    entry.publicId === group.publicId
                        ? {
                              ...entry,
                              active: entry.total,
                              success: 0,
                              fail: 0,
                              canManage: false,
                              items: entry.items.map((item) => ({
                                  ...item,
                                  status: "PENDING",
                                  progress: 0,
                                  retryCount: 0,
                              })),
                          }
                        : entry
                )
            );
        try {
            if (action === "library") {
                if (!group.sourcePublicId)
                    throw new Error(rockIt.vocabularyManager.vocabulary.ERROR);
                await this.addGroupToLibraryAsync(group.sourcePublicId);
                if (sessionVersion !== this.sessionVersion) return;
                this.groupsAtom.set(
                    this.groupsAtom
                        .get()
                        .map((entry) =>
                            entry.publicId === group.publicId
                                ? { ...entry, inLibrary: true }
                                : entry
                        )
                );
            } else {
                const result = await Http.manageDownloadGroup(
                    group.publicId,
                    action
                );
                if (sessionVersion !== this.sessionVersion) return;
                if (!result.isOk()) throw new Error(result.message);
                rockIt.notificationManager.notifySuccess(
                    action === "delete"
                        ? rockIt.vocabularyManager.vocabulary.DELETE_SUCCESS
                        : rockIt.vocabularyManager.vocabulary.DOWNLOAD_STARTED
                );
                await this.refreshAsync();
                if (
                    action === "retry" &&
                    originalDetail?.groupId === group.publicId
                )
                    await this.openGroupAsync(
                        group.publicId,
                        originalDetail.offset
                    );
            }
        } catch (error) {
            if (sessionVersion !== this.sessionVersion) return;
            this.removedGroups.delete(group.publicId);
            this.groupsAtom.set(
                this.groupsAtom
                    .get()
                    .some((entry) => entry.publicId === group.publicId)
                    ? this.groupsAtom
                          .get()
                          .map((entry) =>
                              entry.publicId === group.publicId ? group : entry
                          )
                    : [group, ...this.groupsAtom.get()]
            );
            if (originalDetail?.groupId === group.publicId)
                this.detailAtom.set(originalDetail);
            rockIt.notificationManager.notifyError(
                error instanceof Error
                    ? error.message
                    : rockIt.vocabularyManager.vocabulary.ERROR
            );
        } finally {
            if (sessionVersion === this.sessionVersion) {
                const pending = { ...this.groupPendingAtom.get() };
                delete pending[group.publicId];
                this.groupPendingAtom.set(pending);
            }
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
                if (data.status === "COMPLETED" || data.status === "FAILED") {
                    const v = rockIt.vocabularyManager
                        .vocabulary as unknown as Record<string, string>;
                    rockIt.notificationManager.notify(
                        data.status === "FAILED"
                            ? ENotificationType.ERROR
                            : ENotificationType.SUCCESS,
                        data.status === "FAILED"
                            ? v.NOTIFICATIONS_DOWNLOAD_FAILED
                            : v.NOTIFICATIONS_DOWNLOAD_DONE,
                        {
                            category: "download",
                            key: `download:${data.publicId}:${data.status}:${data.retryCount}`,
                            detail: data.name,
                        }
                    );
                }
                if (data.status === "COMPLETED")
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
