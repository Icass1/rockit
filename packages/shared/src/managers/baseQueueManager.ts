import {
    buildRecommendationQueue,
    recommendationWindowSize,
} from "@/audio/recommendationQueue";
import {
    type BaseAlbumWithSongsResponse,
    type BaseSongWithAlbumResponse,
    type CurrentMediaMessage,
    type CurrentQueueMessageRequestItem,
    type DownloadProgressMessage,
    type QueueResponse,
} from "@/dto";
import { getRockIt } from "@/rockit/rockitRef";
import { shuffle } from "@/utils/arrayTools";
import { EQueueType } from "@/models/enums/queueType";
import { ERepeatMode } from "@/models/enums/repeatMode";
import type { ListenTogetherQueueSnapshot } from "@/models/interfaces/listeningQueueSnapshot";
import { type QueueMediaItem } from "@/models/interfaces/queue";
import type { AutoplayRecommendation } from "@/models/types/autoplayRecommendation";
import {
    isPlayable,
    isQueueable,
    isStation,
    type TListMedia,
    type TPlayableMedia,
    type TQueueMedia,
} from "@/models/types/media";
import { EWebSocketMessage } from "@/models/types/webSocketMessages";
import {
    createArrayAtom,
    createAtom,
    type ReadonlyArrayAtom,
    type ReadonlyAtom,
} from "@/lib/store";

/**
 * Shared queue orchestration. Contains no direct audio/video API — it drives
 * the media player through the registry and reads collaborators (websocket,
 * user, bookmark). Ported from the canonical web implementation.
 */
const AUTOPLAY_LOAD_DELAY_MS = 700;
/** Refresh suggestions when the current song is within this many positions of
 * the queue's end — earlier positions never consume them. */
const AUTOPLAY_NEAR_END_OFFSET = 2;
export class BaseQueueManager {
    // #region: Atoms

    protected _currentMediaAtom = createAtom<TPlayableMedia | undefined>();
    protected _currentListAtom = createAtom<string | undefined>();

    protected _queueAtom = createArrayAtom<QueueMediaItem>([]);
    protected _sortedQueueAtom = createArrayAtom<QueueMediaItem>([]);
    protected _currentQueueMediaIdAtom = createAtom<number | null>(0);
    protected _queueTotalAtom = createAtom(0);
    protected _queuePageSize = 50;
    protected _queuePages = new Map<number, QueueMediaItem[]>();
    protected _queuePageLoads = new Map<number, Promise<boolean>>();
    protected _queueGeneration = 0;
    /** Recommended songs shown under the queue and played once it runs out. */
    protected _autoplayAtom = createArrayAtom<TQueueMedia>([]);
    /** Song the current suggestions were built from, so they are only
     * refetched when the queue actually moves on to something else. */
    protected _autoplaySeedPublicId: string | undefined;
    protected _autoplayQueueIdentity: object | undefined;
    protected _autoplayRecommendationsAtom =
        createArrayAtom<AutoplayRecommendation>([]);
    protected _autoplayPreparing = false;
    protected _autoplayLoadingAtom = createAtom<boolean>(false);
    protected _autoplayLoading: Promise<void> | undefined;
    protected _autoplayPrepareTimer: ReturnType<typeof setTimeout> | undefined;

    /** Pending autoplay refresh (debounced), so a burst of track changes near
     * the end of the queue becomes a single request. */
    protected _autoplayLoadTimer: ReturnType<typeof setTimeout> | undefined;

    protected _lastNavigationDirection: 1 | -1 = 1;
    protected _init = false;
    private _hasInitialQueue = false;
    private _initialMediaPending = false;
    private _initialization?: Promise<void>;
    protected _lifecycleGeneration = 0;
    private _refreshRequest = 0;
    private _playRequest = 0;
    private readonly _downloadRefreshes = new Map<string, number>();
    private _downloadRefreshSequence = 0;
    private _cleanup: (() => void)[] = [];

    protected sortedQueue: QueueMediaItem[] = [];
    protected randomQueue: QueueMediaItem[] = [];

    // #endregion: Atoms

    // #region: Constructor

    seedQueue(queue: QueueResponse): void {
        if (this._init || this._hasInitialQueue) return;
        this._applyQueueResponse(queue);
        this._hasInitialQueue = true;
        this._initialMediaPending = true;
    }

    init(): Promise<void> {
        if (this._init) return this._initialization ?? Promise.resolve();
        this._init = true;
        const generation = ++this._lifecycleGeneration;
        const {
            webSocketManager: socket,
            mediaPlayerManager: player,
            userManager: user,
        } = getRockIt();
        const isCurrent = (): boolean =>
            generation === this._lifecycleGeneration;
        const onCurrentQueue = (): void => {
            if (isCurrent()) void this.refreshAsync(false);
        };
        const onCurrentMedia = (data: CurrentMediaMessage): void => {
            if (isCurrent()) this._handleCurrentMedia(data);
        };
        const schedule = (): void => {
            if (isCurrent()) this._scheduleAutoplayLoad();
        };
        const onDownload = (data: DownloadProgressMessage): void => {
            if (isCurrent() && data.status === "COMPLETED")
                void this.refreshDownloadedMediaAsync(data.mediaPublicId);
        };
        socket.onMessage(EWebSocketMessage.DownloadProgress, onDownload);
        socket.onMessage(EWebSocketMessage.CurrentQueue, onCurrentQueue);
        socket.onMessage(EWebSocketMessage.CurrentMedia, onCurrentMedia);
        this._cleanup = [
            () =>
                socket.offMessage(
                    EWebSocketMessage.DownloadProgress,
                    onDownload
                ),
            () =>
                socket.offMessage(
                    EWebSocketMessage.CurrentQueue,
                    onCurrentQueue
                ),
            () =>
                socket.offMessage(
                    EWebSocketMessage.CurrentMedia,
                    onCurrentMedia
                ),
            this._currentMediaAtom.listen(schedule),
            player.playingAtom.listen(schedule),
            user.repeatModeAtom.listen(schedule),
        ];
        this._initialization = (async (): Promise<void> => {
            if (this._hasInitialQueue) {
                if (this._initialMediaPending) {
                    this._initialMediaPending = false;
                    void player.setMedia(true);
                }
            } else await this._refreshQueueAsync();
            if (!isCurrent()) return;
            socket.requestPlaybackState();
            this._scheduleAutoplayLoad();
        })();
        return this._initialization;
    }

    /** Release integrations without interrupting the current transport or queue. */
    stop(): void {
        this._init = false;
        this._initialization = undefined;
        this._lifecycleGeneration++;
        this._refreshRequest++;
        this._downloadRefreshes.clear();
        this._queueGeneration++;
        for (const cleanup of this._cleanup) cleanup();
        this._cleanup = [];
        this._queuePageLoads.clear();
        clearTimeout(this._autoplayLoadTimer);
        clearTimeout(this._autoplayPrepareTimer);
        this._autoplayLoadTimer = undefined;
        this._autoplayPrepareTimer = undefined;
        this._autoplayPreparing = false;
        this._autoplayLoading = undefined;
        this._autoplayLoadingAtom.set(false);
        this._autoplaySeedPublicId = undefined;
        this._autoplayQueueIdentity = undefined;
    }

    /** Called after stop when the authenticated account is discarded. */
    reset(): void {
        this.stop();
        this._hasInitialQueue = false;
        this._initialMediaPending = false;
        this._queuePages.clear();
        this.sortedQueue = [];
        this.randomQueue = [];
        this._queueAtom.set([]);
        this._sortedQueueAtom.set([]);
        this._queueTotalAtom.set(0);
        this._currentQueueMediaIdAtom.set(null);
        this._currentMediaAtom.set(undefined);
        this._currentListAtom.set(undefined);
        this._lastNavigationDirection = 1;
        this._setRecommendations([]);
    }

    /** Refresh recording metadata without replacing queue occurrences or restarting audio. */
    async refreshDownloadedMediaAsync(publicId: string): Promise<boolean> {
        if (
            !this._init ||
            !this._queueAtom
                .get()
                .some((item) => item.media.publicId === publicId)
        )
            return false;
        const lifecycle = this._lifecycleGeneration,
            queue = this._queueGeneration;
        const request = ++this._downloadRefreshSequence;
        this._downloadRefreshes.set(publicId, request);
        try {
            const response = await getRockIt().http.getMediaAsync(publicId);
            if (
                !this._init ||
                lifecycle !== this._lifecycleGeneration ||
                queue !== this._queueGeneration ||
                this._downloadRefreshes.get(publicId) !== request ||
                !response.isOk()
            )
                return false;
            const updated = response.result.media;
            if (updated.publicId !== publicId || !isPlayable(updated))
                return false;
            const patch = (items: QueueMediaItem[]): QueueMediaItem[] =>
                items.map((item) =>
                    item.media.publicId === publicId
                        ? { ...item, media: updated }
                        : item
                );
            this.sortedQueue = patch(this.sortedQueue);
            this.randomQueue = patch(this.randomQueue);
            for (const [offset, items] of this._queuePages)
                this._queuePages.set(offset, patch(items));
            this._sortedQueueAtom.set([...this.sortedQueue]);
            this._queueAtom.set(patch([...this._queueAtom.get()]));
            if (this._currentMediaAtom.get()?.publicId === publicId)
                this._currentMediaAtom.set(updated);
            return true;
        } catch {
            return false;
        } finally {
            if (this._downloadRefreshes.get(publicId) === request)
                this._downloadRefreshes.delete(publicId);
        }
    }

    async refreshAsync(updateCurrentMedia = true): Promise<void> {
        const generation = this._lifecycleGeneration;
        if (await this._refreshQueueAsync(updateCurrentMedia)) {
            if (generation === this._lifecycleGeneration)
                getRockIt().webSocketManager.requestPlaybackState();
        }
    }

    protected _handleCurrentMedia = (data: CurrentMediaMessage): void => {
        const queue = this._queueAtom.get();
        const item = queue.find(
            (item): boolean =>
                item.queueMediaId === data.queueMediaId &&
                item.media.publicId === data.mediaPublicId
        );

        if (item) {
            this._updateNavigationDirection(queue, data.queueMediaId);
            this._currentQueueMediaIdAtom.set(data.queueMediaId);
            this._currentMediaAtom.set(item.media);
            this._currentListAtom.set(item.listPublicId ?? undefined);
            this._prefetchQueuePageNearEnd(queue);
            void getRockIt().mediaPlayerManager.setMedia(
                false,
                data.playbackId,
                data.currentTimeMs,
                data.isPlaybackOwner
            );
        }
    };

    protected async _refreshQueueAsync(
        updateCurrentMedia: boolean = true
    ): Promise<boolean> {
        const generation = this._lifecycleGeneration;
        const queueGeneration = this._queueGeneration;
        const request = ++this._refreshRequest;
        const response = await getRockIt().http.getQueue(
            undefined,
            this._queuePageSize
        );

        if (
            generation !== this._lifecycleGeneration ||
            request !== this._refreshRequest ||
            queueGeneration !== this._queueGeneration
        )
            return false;
        if (response.isNotOk()) {
            getRockIt().notificationManager.notifyError(
                getRockIt().vocabularyManager.vocabulary.ERROR_GETTING_QUEUE
            );
            return false;
        }

        if (response.isOk()) {
            this._applyQueueResponse(response.result, updateCurrentMedia);
            if (updateCurrentMedia)
                void getRockIt().mediaPlayerManager.setMedia(true);
            return true;
        }
        return false;
    }

    protected _applyQueueResponse(
        queue: QueueResponse,
        updateCurrentMedia: boolean = true
    ): void {
        this._hasInitialQueue = true;
        this._queueGeneration += 1;
        this._queuePages.clear();
        this._queuePageLoads.clear();
        this._queuePages.set(queue.offset, queue.queue);
        this._queueTotalAtom.set(queue.total);
        if (updateCurrentMedia)
            this._currentQueueMediaIdAtom.set(queue.currentQueueMediaId);

        this.sortedQueue = [...queue.queue]
            .sort((a, b): number => a.sortedIndex - b.sortedIndex)
            .map(({ ...item }): QueueMediaItem => item);
        this._sortedQueueAtom.set([...this.sortedQueue]);
        this.randomQueue = [...queue.queue]
            .sort((a, b): number => a.randomIndex - b.randomIndex)
            .map(({ ...item }): QueueMediaItem => item);

        if (queue.queueType === EQueueType.RANDOM)
            this._queueAtom.set(this.randomQueue);
        else if (queue.queueType === EQueueType.SORTED)
            this._queueAtom.set(this.sortedQueue);

        const currentMedia = this._queueAtom
            .get()
            .find(
                (media): boolean =>
                    media.queueMediaId === this._currentQueueMediaIdAtom.get()
            );

        if (updateCurrentMedia) this._currentMediaAtom.set(currentMedia?.media);
        this._currentListAtom.set(currentMedia?.listPublicId ?? undefined);
    }

    /** Load the page after the currently loaded range for playback or scrolling. */
    async loadNextQueuePageAsync(): Promise<boolean> {
        const nextOffset = this._getNextQueueOffset();
        if (nextOffset >= this._queueTotalAtom.get()) return false;
        return this._loadQueuePageAsync(nextOffset);
    }

    /** Load the page before the currently loaded range when scrolling upward. */
    async loadPreviousQueuePageAsync(): Promise<boolean> {
        const firstOffset = Math.min(...this._queuePages.keys());
        if (!Number.isFinite(firstOffset) || firstOffset <= 0) return false;
        return this._loadQueuePageAsync(
            Math.max(0, firstOffset - this._queuePageSize)
        );
    }

    private _getNextQueueOffset(): number {
        let nextOffset = 0;
        for (const [offset, items] of this._queuePages) {
            nextOffset = Math.max(nextOffset, offset + items.length);
        }
        return nextOffset;
    }

    private _prefetchQueuePageNearEnd(queue: QueueMediaItem[]): void {
        const currentIndex = queue.findIndex(
            (item) => item.queueMediaId === this.currentQueueMediaId
        );
        if (
            currentIndex >= 0 &&
            queue.length - currentIndex <= 6 &&
            this.hasNextQueuePage
        ) {
            void this.loadNextQueuePageAsync();
        }
    }

    private async _loadQueuePageAsync(offset: number): Promise<boolean> {
        const existingLoad = this._queuePageLoads.get(offset);
        if (existingLoad) return existingLoad;
        if (this._queuePages.has(offset)) return false;

        const load = (async (): Promise<boolean> => {
            const generation = this._queueGeneration;
            const response = await getRockIt().http.getQueue(
                offset,
                this._queuePageSize
            );
            if (generation !== this._queueGeneration) return false;
            if (response.isNotOk()) {
                getRockIt().notificationManager.notifyError(response.message);
                return false;
            }
            const page = response.result;
            if (!page) return false;

            this._queuePages.set(page.offset, page.queue);
            this._queueTotalAtom.set(page.total);
            const itemsById = new Map<number, QueueMediaItem>();
            for (const page of this._queuePages.values())
                for (const item of page) itemsById.set(item.queueMediaId, item);
            const items = [...itemsById.values()];
            this.sortedQueue = [...items].sort(
                (a, b) => (a.sortedIndex ?? 0) - (b.sortedIndex ?? 0)
            );
            this.randomQueue = [...items].sort(
                (a, b) => (a.randomIndex ?? 0) - (b.randomIndex ?? 0)
            );
            const queueType = getRockIt().userManager.queueTypeAtom.get();
            this._queueAtom.set(
                queueType === EQueueType.RANDOM
                    ? [...this.randomQueue]
                    : [...this.sortedQueue]
            );
            this._sortedQueueAtom.set([...this.sortedQueue]);
            return page.queue.length > 0;
        })();
        this._queuePageLoads.set(offset, load);
        try {
            return await load;
        } finally {
            if (this._queuePageLoads.get(offset) === load)
                this._queuePageLoads.delete(offset);
        }
    }

    // #endregion: Constructor

    // #region: Methods

    protected _captureQueueWork(): () => boolean {
        const lifecycle = this._lifecycleGeneration;
        const queue = this._queueGeneration;
        return (): boolean =>
            lifecycle === this._lifecycleGeneration &&
            queue === this._queueGeneration;
    }

    private _beginPlaybackSelection(): () => boolean {
        const lifecycle = this._lifecycleGeneration;
        const request = ++this._playRequest;
        return (): boolean =>
            lifecycle === this._lifecycleGeneration &&
            request === this._playRequest;
    }

    /**
     * Fetch the playable medias of a list. Default resolves albums through the
     * HTTP client; a platform subclass may override for local caching.
     */
    protected async getAlbumAsync(
        publicId: string
    ): Promise<BaseAlbumWithSongsResponse | undefined> {
        const isCurrent = this._captureQueueWork();
        const response = await getRockIt().http.getAlbum(publicId);
        if (!isCurrent()) return undefined;
        if (response.isOk()) {
            return response.result;
        }
        getRockIt().notificationManager.notifyError(
            getRockIt().vocabularyManager.vocabulary.ERROR_GETTING_ALBUM
        );
        return undefined;
    }

    updateQueue(shuffleRandom?: boolean): void {
        if (!this.isQueueFullyLoaded && this._queueTotalAtom.get() > 0) {
            getRockIt().notificationManager.notifyError(
                "Load the queue before editing it. Scroll through the queue to load more items."
            );
            void this._refreshQueueAsync(false);
            return;
        }

        const queueType = getRockIt().userManager.queueTypeAtom.get();

        if (queueType === EQueueType.RANDOM) {
            if (shuffleRandom) {
                const currentQueueMediaId = this._currentQueueMediaIdAtom.get();
                const currentIndex = this.randomQueue.findIndex(
                    (item): boolean => item.queueMediaId === currentQueueMediaId
                );
                if (currentIndex >= 0) {
                    const [currentItem] = this.randomQueue.splice(
                        currentIndex,
                        1
                    );
                    this.randomQueue = shuffle(this.randomQueue);
                    this.randomQueue.unshift(currentItem);
                } else {
                    this.randomQueue = shuffle(this.randomQueue);
                }
            }
            this._queueAtom.set([...this.randomQueue]);
        } else if (queueType === EQueueType.SORTED)
            this._queueAtom.set([...this.sortedQueue]);

        const currentMedia = this._queueAtom
            .get()
            .find(
                (media): boolean =>
                    media.queueMediaId === this._currentQueueMediaIdAtom.get()
            );

        this._currentMediaAtom.set(currentMedia?.media);
        this._currentListAtom.set(currentMedia?.listPublicId ?? undefined);
        this._sortedQueueAtom.set([...this.sortedQueue]);
        this._sendCurrentQueue();
    }

    protected _sendCurrentQueue(): void {
        const randomIndexByQueueMediaId = new Map<number, number>();
        this.randomQueue.forEach((item, index): void => {
            randomIndexByQueueMediaId.set(item.queueMediaId, index);
        });

        getRockIt().webSocketManager.sendCurrentQueue({
            queue: this.sortedQueue.map(
                (item, index): CurrentQueueMessageRequestItem => {
                    const sortedIndex = index;
                    const randomIndex =
                        randomIndexByQueueMediaId.get(item.queueMediaId) ?? 0;
                    return {
                        listPublicId: item.listPublicId,
                        mediaPublicId: item.media.publicId,
                        queueMediaId: item.queueMediaId,
                        randomIndex,
                        sortedIndex,
                    };
                }
            ),
        });
    }

    skipBack(): void {
        const jumped = getRockIt().bookmarkManager.skipToPrevBookmark();
        if (jumped) return;

        const currentTime = getRockIt().mediaPlayerManager.currentTime;
        if (currentTime >= 3) {
            getRockIt().mediaPlayerManager.setCurrentTime(0, true);
            return;
        }

        this._lastNavigationDirection = -1;
        if (this.currentMedia?.publicId)
            getRockIt().webSocketManager.sendSkipClicked({
                direction: "PREVIOUS",
                mediaPublicId: this.currentMedia.publicId,
            });
        const currentQueueMediaId = this.currentQueueMediaId;
        const queue = this.queue;
        if (!queue.length) return;

        const currentIndex = queue.findIndex(
            (item): boolean => item.queueMediaId === currentQueueMediaId
        );

        if (currentIndex === 0 && Math.min(...this._queuePages.keys()) > 0) {
            void this._skipBackAfterLoadingAsync(currentQueueMediaId);
            return;
        }
        if (
            currentIndex === 0 &&
            this.isQueueFullyLoaded === false &&
            this.hasNextQueuePage
        ) {
            void this._wrapBackToQueueEndAsync();
            return;
        }

        const prevIndex = (currentIndex - 1 + queue.length) % queue.length;
        this.setQueueMediaId(queue[prevIndex].queueMediaId, -1);
        getRockIt().mediaPlayerManager.play();
    }

    skipForward(): void {
        const jumped = getRockIt().bookmarkManager.skipToNextBookmark();
        if (jumped) return;

        this._lastNavigationDirection = 1;
        if (this.currentMedia?.publicId)
            getRockIt().webSocketManager.sendSkipClicked({
                direction: "NEXT",
                mediaPublicId: this.currentMedia.publicId,
            });
        const currentQueueMediaId = this.currentQueueMediaId;
        const queue = this.queue;
        if (!queue.length) return;

        const currentIndex = queue.findIndex(
            (item): boolean => item.queueMediaId === currentQueueMediaId
        );

        if (
            currentIndex === queue.length - 1 &&
            this._getNextQueueOffset() < this._queueTotalAtom.get()
        ) {
            void this._skipForwardAfterLoadingAsync(currentQueueMediaId);
            return;
        }
        if (
            currentIndex === queue.length - 1 &&
            !this.isQueueFullyLoaded &&
            this.hasPreviousQueuePage
        ) {
            void this._wrapForwardToQueueStartAsync();
            return;
        }

        const nextIndex = (currentIndex + 1) % queue.length;
        this.setQueueMediaId(queue[nextIndex].queueMediaId, 1);
        getRockIt().mediaPlayerManager.play();
    }

    private async _skipForwardAfterLoadingAsync(
        currentQueueMediaId: number | null
    ): Promise<void> {
        const generation = this._lifecycleGeneration;
        const queueGeneration = this._queueGeneration;
        if (
            !(await this.loadNextQueuePageAsync()) ||
            generation !== this._lifecycleGeneration ||
            queueGeneration !== this._queueGeneration ||
            currentQueueMediaId !== this.currentQueueMediaId
        )
            return;
        const queue = this.queue;
        const currentIndex = queue.findIndex(
            (item) => item.queueMediaId === currentQueueMediaId
        );
        const nextItem = queue[currentIndex + 1];
        if (!nextItem) return;
        this._lastNavigationDirection = 1;
        this.setQueueMediaId(nextItem.queueMediaId, 1);
        getRockIt().mediaPlayerManager.play();
    }

    private async _skipBackAfterLoadingAsync(
        currentQueueMediaId: number | null
    ): Promise<void> {
        const generation = this._lifecycleGeneration;
        const queueGeneration = this._queueGeneration;
        if (
            !(await this.loadPreviousQueuePageAsync()) ||
            generation !== this._lifecycleGeneration ||
            queueGeneration !== this._queueGeneration ||
            currentQueueMediaId !== this.currentQueueMediaId
        )
            return;
        const queue = this.queue;
        const currentIndex = queue.findIndex(
            (item) => item.queueMediaId === currentQueueMediaId
        );
        const previousItem = queue[currentIndex - 1];
        if (!previousItem) return;
        this._lastNavigationDirection = -1;
        this.setQueueMediaId(previousItem.queueMediaId, -1);
        getRockIt().mediaPlayerManager.play();
    }

    private async _wrapBackToQueueEndAsync(): Promise<void> {
        const generation = this._lifecycleGeneration;
        const queueGeneration = this._queueGeneration;
        const currentId = this.currentQueueMediaId;
        while (this.hasNextQueuePage) {
            if (
                !(await this.loadNextQueuePageAsync()) ||
                generation !== this._lifecycleGeneration ||
                queueGeneration !== this._queueGeneration ||
                currentId !== this.currentQueueMediaId
            )
                return;
        }
        const lastItem = this.queue.at(-1);
        if (!lastItem) return;
        this._lastNavigationDirection = -1;
        this.setQueueMediaId(lastItem.queueMediaId, -1);
        getRockIt().mediaPlayerManager.play();
    }

    private async _wrapForwardToQueueStartAsync(): Promise<void> {
        const generation = this._lifecycleGeneration;
        const queueGeneration = this._queueGeneration;
        const currentId = this.currentQueueMediaId;
        while (this.hasPreviousQueuePage) {
            if (
                !(await this.loadPreviousQueuePageAsync()) ||
                generation !== this._lifecycleGeneration ||
                queueGeneration !== this._queueGeneration ||
                currentId !== this.currentQueueMediaId
            )
                return;
        }
        const firstItem = this.queue[0];
        if (!firstItem) return;
        this._lastNavigationDirection = 1;
        this.setQueueMediaId(firstItem.queueMediaId, 1);
        getRockIt().mediaPlayerManager.play();
    }

    setMedia(medias: TQueueMedia[], listPublicId: string): void {
        this._playRequest++;
        this._hasInitialQueue = true;
        this._initialMediaPending = false;
        this._queueGeneration += 1;
        this._queuePages.clear();
        this._queuePageLoads.clear();
        this._queueTotalAtom.set(medias.length);
        this.sortedQueue = medias.map((media, index): QueueMediaItem => {
            return {
                media: media,
                listPublicId: listPublicId,
                queueMediaId: index,
                sortedIndex: index,
            };
        });

        this.randomQueue = medias.map((media, index): QueueMediaItem => {
            return {
                media: media,
                listPublicId: listPublicId,
                queueMediaId: index,
            };
        });

        const shuffleInPlace = (array: QueueMediaItem[]): void => {
            for (let i = array.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [array[i], array[j]] = [array[j], array[i]];
            }
        };

        shuffleInPlace(this.randomQueue);
        this.randomQueue.forEach((item, index): void => {
            item.randomIndex = index;
        });
        if (this.sortedQueue.length > 0)
            this._queuePages.set(0, this.sortedQueue);

        // Publish the replacement before updateQueue checks whether it is complete.
        this._queueAtom.set([
            ...(getRockIt().userManager.queueTypeAtom.get() ===
            EQueueType.RANDOM
                ? this.randomQueue
                : this.sortedQueue),
        ]);
        this.updateQueue();
    }

    moveToMedia(publicId: string): void {
        const media = this._queueAtom
            .get()
            .find((media): boolean => media.media.publicId === publicId);
        if (!media) {
            getRockIt().notificationManager.notifyError(
                "(moveToMedia) Media not found in queue."
            );
            return;
        }
        getRockIt().webSocketManager.sendMediaClicked({
            mediaPublicId: publicId,
        });
        this.setQueueMediaId(media.queueMediaId);
    }

    protected _updateNavigationDirection(
        queue: QueueMediaItem[],
        targetId: number,
        direction?: 1 | -1
    ): void {
        if (direction !== undefined) {
            this._lastNavigationDirection = direction;
            return;
        }
        const previousIndex = queue.findIndex(
            (item) => item.queueMediaId === this.currentQueueMediaId
        );
        const targetIndex = queue.findIndex(
            (item) => item.queueMediaId === targetId
        );
        if (
            previousIndex >= 0 &&
            targetIndex >= 0 &&
            previousIndex !== targetIndex
        )
            this._lastNavigationDirection =
                targetIndex > previousIndex ? 1 : -1;
    }

    setQueueMediaId(): void;
    setQueueMediaId(queueMediaId: number, direction?: 1 | -1): void;
    setQueueMediaId(queueMediaId?: number, direction?: 1 | -1): void {
        this._playRequest++;
        if (typeof queueMediaId === "number") {
            const queue = this._queueAtom.get();

            let media = queue.find(
                (media): boolean => media.queueMediaId === queueMediaId
            );

            if (!media) {
                getRockIt().notificationManager.notifyError(
                    "(setIndex) Media not found in queue."
                );
                return;
            }

            if (!isStation(media.media) && !media.media.downloaded) {
                getRockIt().notificationManager.notifyWarn(
                    getRockIt().vocabularyManager.vocabulary
                        .MEDIA_NOT_DOWNLOADED
                );
                const index = queue.indexOf(media);
                media = undefined;
                for (let i = 1; i < queue.length; i++) {
                    const nextIndex =
                        (index + (direction ?? 1) * i + queue.length) %
                        queue.length;
                    const candidate = queue[nextIndex];
                    if (
                        isStation(candidate.media) ||
                        candidate.media.downloaded
                    ) {
                        media = candidate;
                        break;
                    }
                }
                if (!media) {
                    getRockIt().mediaPlayerManager.pause();
                    this._currentQueueMediaIdAtom.set(null);
                    this._currentMediaAtom.set(undefined);
                    this._currentListAtom.set(undefined);
                    return;
                }
            }

            // Use visible queue positions, not numeric IDs (random queues reorder IDs).
            // Explicit next/previous wins at the wrap from either end of the queue.
            this._updateNavigationDirection(
                queue,
                media.queueMediaId,
                direction
            );

            // Publish only the final playable item, never an unavailable stopover.
            this._currentQueueMediaIdAtom.set(media.queueMediaId);
            this._currentMediaAtom.set(media.media);
            this._currentListAtom.set(media.listPublicId ?? undefined);
            this._prefetchQueuePageNearEnd(queue);
        } else {
            const queue = this.queue;
            if (queue.length === 0) return;

            if (getRockIt().userManager.queueType === EQueueType.RANDOM) {
                const randomItem =
                    queue[Math.floor(Math.random() * queue.length)];
                this.setQueueMediaId(randomItem.queueMediaId);
            } else if (
                getRockIt().userManager.queueType === EQueueType.SORTED
            ) {
                this.setQueueMediaId(queue[0].queueMediaId);
            } else {
                throw `Unkown queue type ${getRockIt().userManager.queueType}`;
            }
        }
    }

    setCurrentList(currentList: string | undefined): void {
        this._currentListAtom.set(currentList);
    }

    clearCurrentMedia(): void {
        this._playRequest++;
        this._currentMediaAtom.set(undefined);
    }

    async addListToQueueTopAsync(media: TListMedia): Promise<void> {
        const isCurrent = this._captureQueueWork();
        const medias = await this.getListMediasAsync(media);
        if (!isCurrent() || medias.length === 0) return;

        const queueableMedias = medias.filter(isQueueable);
        if (queueableMedias.length === 0) return;

        const currentMaxId = this.sortedQueue.reduce(
            (max, item): number => Math.max(max, item.queueMediaId),
            0
        );

        const newItems = queueableMedias.map(
            (media, index): QueueMediaItem => ({
                media,
                listPublicId: media.publicId,
                queueMediaId: currentMaxId + 1 + index,
            })
        );

        this.sortedQueue = [...newItems, ...this.sortedQueue];
        this.randomQueue = [...shuffle(newItems), ...this.randomQueue];

        this.updateQueue();
    }

    async addListToQueueRandomAsync(media: TListMedia): Promise<void> {
        const isCurrent = this._captureQueueWork();
        const medias = await this.getListMediasAsync(media);
        if (!isCurrent() || medias.length === 0) return;

        const queueableMedias = medias.filter(isQueueable);
        if (queueableMedias.length === 0) return;

        const shuffledMedias = shuffle(queueableMedias);

        const currentQueueMediaId = this._currentQueueMediaIdAtom.get();

        const sortedInsertBase = this.sortedQueue.findIndex(
            (item): boolean => item.queueMediaId === currentQueueMediaId
        );
        const sortedStart =
            sortedInsertBase >= 0
                ? sortedInsertBase + 1
                : this.sortedQueue.length;

        const randomInsertBase = this.randomQueue.findIndex(
            (item): boolean => item.queueMediaId === currentQueueMediaId
        );
        const randomStart =
            randomInsertBase >= 0
                ? randomInsertBase + 1
                : this.randomQueue.length;

        const currentMaxId = this.sortedQueue.reduce(
            (max, item): number => Math.max(max, item.queueMediaId),
            0
        );

        shuffledMedias.forEach((media, index): void => {
            const newItem: QueueMediaItem = {
                media,
                listPublicId: media.publicId,
                queueMediaId: currentMaxId + 1 + index,
            };

            const si =
                sortedStart +
                Math.floor(
                    Math.random() * (this.sortedQueue.length - sortedStart)
                );
            this.sortedQueue.splice(si, 0, newItem);
        });

        const reshuffled = shuffle(queueableMedias);
        reshuffled.forEach((media, index): void => {
            const newItem: QueueMediaItem = {
                media,
                listPublicId: media.publicId,
                queueMediaId: currentMaxId + 1 + index,
            };

            const ri =
                randomStart +
                Math.floor(
                    Math.random() * (this.randomQueue.length - randomStart)
                );
            this.randomQueue.splice(ri, 0, newItem);
        });

        this.updateQueue();
    }

    async addListToQueueBottomAsync(media: TListMedia): Promise<void> {
        const isCurrent = this._captureQueueWork();
        const medias = await this.getListMediasAsync(media);
        if (!isCurrent() || medias.length === 0) return;

        const queueableMedias = medias.filter(isQueueable);
        if (queueableMedias.length === 0) return;

        const currentMaxId = this.sortedQueue.reduce(
            (max, item): number => Math.max(max, item.queueMediaId),
            0
        );

        const newItems = queueableMedias.map(
            (media, index): QueueMediaItem => ({
                media,
                listPublicId: media.publicId,
                queueMediaId: currentMaxId + 1 + index,
            })
        );

        this.sortedQueue = [...this.sortedQueue, ...newItems];
        this.randomQueue = [...this.randomQueue, ...shuffle(newItems)];

        this.updateQueue();
    }

    async playCollection(
        publicId: string,
        startPublicId?: string
    ): Promise<void> {
        const isCurrent = this._beginPlaybackSelection();
        const payload = { startPublicId: startPublicId ?? null };
        const featuredIds = [
            "liked",
            "most-listened",
            "recent-mix",
            "last-month",
            "year-recap",
        ];
        const response = featuredIds.includes(publicId)
            ? await getRockIt().http.createFeaturedQueue(publicId, payload)
            : await getRockIt().http.createCollectionQueue(publicId, payload);
        if (!isCurrent()) return;
        if (response.isNotOk()) {
            if (response.code === 0) {
                const cached =
                    await getRockIt().http.resolveCollectionQueue(publicId);
                if (!isCurrent()) return;
                if (cached.isOk()) {
                    this.setMedia(
                        cached.result.queue.map((item) => item.media),
                        publicId
                    );
                    if (startPublicId) this.moveToMedia(startPublicId);
                    else this.setQueueMediaId();
                    getRockIt().mediaPlayerManager.play();
                    return;
                }
            }
            getRockIt().notificationManager.notifyError(response.message);
            return;
        }
        if (!response.isOk()) return;
        const queue = response.result;
        void this.cacheCollectionQueueAsync(publicId, queue);
        this._applyQueueResponse(queue);
        if (queue.currentQueueMediaId !== null)
            this.setQueueMediaId(queue.currentQueueMediaId);
        getRockIt().mediaPlayerManager.play();
    }

    protected async cacheCollectionQueueAsync(
        _publicId: string,
        _queue: QueueResponse
    ): Promise<void> {
        // Platforms may preserve the resolved queue for offline playback.
    }

    async playList(media: TListMedia): Promise<void> {
        await this.playCollection(media.publicId);
    }

    async getListMediasAsync(media: TListMedia): Promise<TPlayableMedia[]> {
        const isCurrent = this._captureQueueWork();
        const response = await getRockIt().http.resolveCollectionQueue(
            media.publicId
        );
        if (!isCurrent()) return [];
        if (response.isNotOk()) {
            getRockIt().notificationManager.notifyError(response.message);
            return [];
        }
        return response.isOk()
            ? response.result.queue.map((item) => item.media)
            : [];
    }

    reorderQueue(fromIndex: number, toIndex: number): void {
        if (fromIndex < 0 || fromIndex >= this.sortedQueue.length) return;
        if (toIndex < 0 || toIndex >= this.sortedQueue.length) return;
        if (fromIndex === toIndex) return;

        const [movedItem] = this.sortedQueue.splice(fromIndex, 1);
        this.sortedQueue.splice(toIndex, 0, movedItem);

        const [movedRandomItem] = this.randomQueue.splice(fromIndex, 1);
        this.randomQueue.splice(toIndex, 0, movedRandomItem);

        this.updateQueue();
    }

    removeMediaFromQueue(media: TPlayableMedia): void {
        const currentQueueMediaId = this._currentQueueMediaIdAtom.get();

        const sortedIndex = this.sortedQueue.findIndex(
            (item): boolean => item.media.publicId === media.publicId
        );
        if (sortedIndex === -1) return;

        const removed = this.sortedQueue[sortedIndex];
        const isCurrent = removed.queueMediaId === currentQueueMediaId;

        this.sortedQueue.splice(sortedIndex, 1);

        const randomIndex = this.randomQueue.findIndex(
            (item): boolean => item.media.publicId === media.publicId
        );
        if (randomIndex !== -1) {
            this.randomQueue.splice(randomIndex, 1);
        }

        if (isCurrent) {
            if (this.sortedQueue.length > 0) {
                const nextIndex = Math.min(
                    sortedIndex,
                    this.sortedQueue.length - 1
                );
                this._currentQueueMediaIdAtom.set(
                    this.sortedQueue[nextIndex].queueMediaId
                );
                this._currentMediaAtom.set(this.sortedQueue[nextIndex].media);
            } else {
                this._currentQueueMediaIdAtom.set(null);
                this._currentMediaAtom.set(undefined);
                getRockIt().mediaPlayerManager.pause();
            }
        }

        this.updateQueue();
    }

    addMediaNext(media: TPlayableMedia): void {
        if (!isQueueable(media)) return;

        const currentQueueMediaId = this._currentQueueMediaIdAtom.get();

        const currentSortedIndex = this.sortedQueue.findIndex(
            (item): boolean => item.queueMediaId === currentQueueMediaId
        );

        const currentMaxId = this.sortedQueue.reduce(
            (max, item): number => Math.max(max, item.queueMediaId),
            0
        );

        const newItem: QueueMediaItem = {
            media,
            listPublicId: media.publicId,
            queueMediaId: currentMaxId + 1,
        };

        const insertIndex =
            currentSortedIndex >= 0
                ? currentSortedIndex + 1
                : this.sortedQueue.length;

        this.sortedQueue.splice(insertIndex, 0, newItem);

        const currentRandomIndex = this.randomQueue.findIndex(
            (item): boolean => item.queueMediaId === currentQueueMediaId
        );
        const randomInsertIndex =
            currentRandomIndex >= 0
                ? currentRandomIndex + 1
                : this.randomQueue.length;
        this.randomQueue.splice(randomInsertIndex, 0, { ...newItem });

        this.updateQueue();
    }

    captureListeningQueue(): ListenTogetherQueueSnapshot {
        return {
            sorted: [...this.sortedQueue],
            random: [...this.randomQueue],
            currentQueueMediaId: this.currentQueueMediaId,
            time: getRockIt().mediaPlayerManager.currentTime,
            total: this._queueTotalAtom.get(),
            pages: [...this._queuePages].map(([offset, items]) => [
                offset,
                [...items],
            ]),
        };
    }

    restoreListeningQueue(snapshot: ListenTogetherQueueSnapshot): void {
        this._queueGeneration++;
        this._queuePageLoads.clear();
        this._queuePages = new Map(
            snapshot.pages?.length ? snapshot.pages : [[0, snapshot.sorted]]
        );
        this._queueTotalAtom.set(snapshot.total ?? snapshot.sorted.length);
        this.sortedQueue = [...snapshot.sorted];
        this.randomQueue = [...snapshot.random];
        this.updateQueue();
        if (
            snapshot.currentQueueMediaId !== null &&
            this.queue.some(
                (item) => item.queueMediaId === snapshot.currentQueueMediaId
            )
        )
            this.setQueueMediaId(snapshot.currentQueueMediaId);
        else this.clearCurrentMedia();
    }

    /** Changes when the queue is replaced, allowing pending loads to stop. */
    get queueIdentity(): object {
        return this.sortedQueue;
    }

    /** Append a batch with one state update and one WebSocket synchronization. */
    appendMedias(medias: TPlayableMedia[], listPublicId: string): void {
        let nextId =
            this.sortedQueue.reduce(
                (max, item) => Math.max(max, item.queueMediaId),
                -1
            ) + 1;
        const items = medias.filter(isQueueable).map((media) => ({
            media,
            listPublicId,
            queueMediaId: nextId++,
        }));
        if (!items.length) return;
        this.sortedQueue.push(...items);
        // Keep the played prefix and current song stable; mix only what is next.
        const currentIndex = this.randomQueue.findIndex(
            (item) => item.queueMediaId === this.currentQueueMediaId
        );
        const pendingStart = currentIndex + 1;
        const pending = [...this.randomQueue.slice(pendingStart), ...items];
        for (let i = pending.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [pending[i], pending[j]] = [pending[j], pending[i]];
        }
        this.randomQueue.splice(
            pendingStart,
            this.randomQueue.length - pendingStart,
            ...pending
        );
        this.updateQueue();
    }

    addMediaToEnd(media: TPlayableMedia): void {
        if (!isQueueable(media)) return;

        const currentMaxId = this.sortedQueue.reduce(
            (max, item): number => Math.max(max, item.queueMediaId),
            0
        );

        const newItem: QueueMediaItem = {
            media,
            listPublicId: media.publicId,
            queueMediaId: currentMaxId + 1,
        };

        this.sortedQueue.push(newItem);
        this.randomQueue.push({ ...newItem });

        this.updateQueue();
    }

    addMediaRandom(media: TPlayableMedia): void {
        if (!isQueueable(media)) return;

        const currentQueueMediaId = this._currentQueueMediaIdAtom.get();

        const currentSortedIndex = this.sortedQueue.findIndex(
            (item): boolean => item.queueMediaId === currentQueueMediaId
        );

        const currentMaxId = this.sortedQueue.reduce(
            (max, item): number => Math.max(max, item.queueMediaId),
            0
        );

        const newItem: QueueMediaItem = {
            media,
            listPublicId: media.publicId,
            queueMediaId: currentMaxId + 1,
        };

        const sortedStart =
            currentSortedIndex >= 0
                ? currentSortedIndex + 1
                : this.sortedQueue.length;
        const sortedInsertIndex =
            sortedStart +
            Math.floor(
                Math.random() * (this.sortedQueue.length - sortedStart + 1)
            );
        this.sortedQueue.splice(sortedInsertIndex, 0, newItem);

        const currentRandomIndex = this.randomQueue.findIndex(
            (item): boolean => item.queueMediaId === currentQueueMediaId
        );
        const randomStart =
            currentRandomIndex >= 0
                ? currentRandomIndex + 1
                : this.randomQueue.length;
        const randomInsertIndex =
            randomStart +
            Math.floor(
                Math.random() * (this.randomQueue.length - randomStart + 1)
            );
        this.randomQueue.splice(randomInsertIndex, 0, { ...newItem });

        this.updateQueue();
    }

    peekNextQueueItem(): QueueMediaItem | undefined {
        const currentQueueMediaId = this.currentQueueMediaId;
        const queue = this.queue;
        if (queue.length === 0) return undefined;

        const currentIndex = queue.findIndex(
            (item): boolean => item.queueMediaId === currentQueueMediaId
        );
        for (let offset = 1; offset <= queue.length; offset++) {
            const nextIndex =
                (currentIndex + offset + queue.length) % queue.length;
            const candidate = queue[nextIndex];
            if (isStation(candidate.media) || candidate.media.downloaded)
                return candidate;
        }
        return undefined;
    }

    // #endregion: Methods

    // #region: Getters

    get currentMediaAtom(): ReadonlyAtom<TPlayableMedia | undefined> {
        return this._currentMediaAtom.getReadonlyAtom();
    }

    get currentMedia(): TPlayableMedia | undefined {
        return this._currentMediaAtom.get();
    }

    get currentListAtom(): ReadonlyAtom<string | undefined> {
        return this._currentListAtom.getReadonlyAtom();
    }

    get currentList(): string | undefined {
        return this._currentListAtom.get();
    }

    get queueAtom(): ReadonlyArrayAtom<QueueMediaItem> {
        return this._queueAtom.getReadonlyAtom();
    }

    get queueTotalCount(): number {
        return this._queueTotalAtom.get();
    }

    get hasNextQueuePage(): boolean {
        return this._getNextQueueOffset() < this._queueTotalAtom.get();
    }

    get hasPreviousQueuePage(): boolean {
        const firstOffset = Math.min(...this._queuePages.keys());
        return Number.isFinite(firstOffset) && firstOffset > 0;
    }

    get isQueueFullyLoaded(): boolean {
        const count = new Set(this.queue.map((item) => item.queueMediaId)).size;
        return count >= this._queueTotalAtom.get();
    }

    get sortedQueueAtom(): ReadonlyArrayAtom<QueueMediaItem> {
        return this._sortedQueueAtom.getReadonlyAtom();
    }

    get queue(): QueueMediaItem[] {
        return this._queueAtom.get();
    }

    get currentQueueMediaIdAtom(): ReadonlyAtom<number | null> {
        return this._currentQueueMediaIdAtom.getReadonlyAtom();
    }

    get currentQueueMediaId(): number | null {
        return this._currentQueueMediaIdAtom.get();
    }

    get lastNavigationDirection(): 1 | -1 {
        return this._lastNavigationDirection;
    }

    get autoplayAtom(): ReadonlyArrayAtom<TQueueMedia> {
        return this._autoplayAtom.getReadonlyAtom();
    }

    get autoplay(): TQueueMedia[] {
        return this._autoplayAtom.get();
    }

    // #endregion: Getters

    // #region: Autoplay

    /** Explicit Home/queue selection: missing audio is downloaded on demand,
     * never as a side effect of rendering a recommendation. */
    async playRecommendedSongAsync(
        song: BaseSongWithAlbumResponse,
        songs: BaseSongWithAlbumResponse[] = [song]
    ): Promise<void> {
        const isCurrent = this._beginPlaybackSelection();
        if (
            this.currentMedia?.publicId === song.publicId &&
            getRockIt().mediaPlayerManager.playingAtom.get()
        ) {
            getRockIt().mediaPlayerManager.pause();
            return;
        }
        const fresh = await getRockIt().http.getSong(song.publicId);
        if (!isCurrent()) return;
        if (!fresh.isOk()) {
            getRockIt().notificationManager.notifyError(fresh.message);
            return;
        }
        if (!fresh.result.downloaded) {
            const started = await getRockIt().http.startDownload({
                ids: [song.publicId],
                title: song.name,
            });
            if (!isCurrent()) return;
            if (started.isOk())
                getRockIt().notificationManager.notifyInfo(
                    getRockIt().vocabularyManager.vocabulary.DOWNLOAD_STARTED
                );
            else getRockIt().notificationManager.notifyError(started.message);
            return;
        }
        this.setMedia(
            songs
                .map((entry) =>
                    entry.publicId === song.publicId ? fresh.result : entry
                )
                .filter((entry) => entry.downloaded),
            "recommendations"
        );
        this.moveToMedia(song.publicId);
        getRockIt().mediaPlayerManager.play();
    }

    async playAutoplayRecommendationAsync(
        item: AutoplayRecommendation
    ): Promise<void> {
        const isCurrent = this._captureQueueWork();
        const media = item.kind === "song" ? item.song : item.item;
        if (media.publicId && (item.kind === "song" || media.downloaded)) {
            const fresh = await getRockIt().http.getSong(media.publicId);
            if (!isCurrent()) return;
            if (!fresh.isOk()) {
                getRockIt().notificationManager.notifyError(fresh.message);
                return;
            }
            if (!fresh.result.downloaded) {
                const started = await getRockIt().http.startDownload({
                    ids: [media.publicId],
                    title: media.name,
                });
                if (!isCurrent()) return;
                if (started.isOk())
                    getRockIt().notificationManager.notifyInfo(
                        getRockIt().vocabularyManager.vocabulary
                            .DOWNLOAD_STARTED
                    );
                else
                    getRockIt().notificationManager.notifyError(
                        started.message
                    );
                return;
            }
            if (
                !this.queue.some(
                    (entry) => entry.media.publicId === fresh.result.publicId
                )
            )
                this.addMediaNext(fresh.result);
            this._setRecommendations(this._autoplayRecommendationsAtom.get());
            return;
        }
        const started = await getRockIt().http.startDownloadFromSearch({
            artistName: media.artists[0]?.name ?? "",
            trackName: media.name,
            addToLibrary: true,
            addToPlaylist: false,
            playlistPublicId: null,
        });
        if (!isCurrent()) return;
        if (started.isOk())
            getRockIt().notificationManager.notifyInfo(
                getRockIt().vocabularyManager.vocabulary.DOWNLOAD_STARTED
            );
        else getRockIt().notificationManager.notifyError(started.message);
    }

    get autoplayLoadingAtom(): ReadonlyAtom<boolean> {
        return this._autoplayLoadingAtom.getReadonlyAtom();
    }

    get autoplayRecommendationsAtom(): ReadonlyArrayAtom<AutoplayRecommendation> {
        return this._autoplayRecommendationsAtom.getReadonlyAtom();
    }

    protected _setRecommendations(items: AutoplayRecommendation[]): void {
        const queued = new Set(this.queue.map((entry) => entry.media.publicId));
        const filtered = items.filter((entry) =>
            entry.kind === "song"
                ? !queued.has(entry.song.publicId)
                : !entry.item.publicId || !queued.has(entry.item.publicId)
        );
        this._autoplayRecommendationsAtom.set(filtered);
        this._autoplayAtom.set(
            filtered.flatMap((entry) =>
                entry.kind === "song" ? [entry.song] : []
            )
        );
    }

    async loadAutoplaySuggestionsAsync(): Promise<void> {
        const generation = this._lifecycleGeneration;
        const current = this.currentMedia;
        if (!current || isStation(current)) {
            this._setRecommendations([]);
            this._autoplaySeedPublicId = undefined;
            return;
        }
        const seed = this.queue.at(-1)?.media ?? current;
        const identity = this.queueIdentity;
        if (
            this._autoplaySeedPublicId === seed.publicId &&
            this._autoplayQueueIdentity === identity
        ) {
            if (this._autoplayLoading) await this._autoplayLoading;
            return;
        }
        this._autoplaySeedPublicId = seed.publicId;
        this._autoplayQueueIdentity = identity;
        this._autoplayLoadingAtom.set(true);
        this._setRecommendations([]);
        const loading = (async (): Promise<void> => {
            const response = await getRockIt().http.getRelatedSongs(
                seed.publicId,
                20,
                true
            );
            if (
                generation !== this._lifecycleGeneration ||
                this.queueIdentity !== identity ||
                this._autoplaySeedPublicId !== seed.publicId ||
                this.queue.at(-1)?.media.publicId !== seed.publicId
            )
                return;
            if (!response.isOk()) {
                this._autoplaySeedPublicId = undefined;
                return;
            }
            this._setRecommendations(
                buildRecommendationQueue(
                    response.result,
                    new Set(this.queue.map((entry) => entry.media.publicId))
                )
            );
        })();
        this._autoplayLoading = loading;
        try {
            await loading;
        } finally {
            if (this._autoplayLoading === loading) {
                this._autoplayLoading = undefined;
                this._autoplayLoadingAtom.set(false);
            }
        }
    }

    protected _canPrepareAutoplay(): boolean {
        const player = getRockIt().mediaPlayerManager;
        const media = this.currentMedia;
        return (
            this._init &&
            !!media &&
            player.playingAtom.get() &&
            player.isPlaybackOwner &&
            getRockIt().userManager.repeatModeAtom.get() === ERepeatMode.OFF &&
            this._isNearQueueEnd() &&
            !isStation(media)
        );
    }

    protected _scheduleAutoplayLoad(): void {
        if (this._autoplayPrepareTimer)
            clearTimeout(this._autoplayPrepareTimer);
        this._autoplayPrepareTimer = undefined;
        if (!this._canPrepareAutoplay() || this._autoplayLoadTimer) return;
        const generation = this._lifecycleGeneration;
        this._autoplayLoadTimer = setTimeout((): void => {
            if (generation !== this._lifecycleGeneration) return;
            this._autoplayLoadTimer = undefined;
            void this.prepareAutoplayAsync();
        }, AUTOPLAY_LOAD_DELAY_MS);
    }

    protected _isNearQueueEnd(): boolean {
        const item = this.queue.find(
            (item) => item.queueMediaId === this.currentQueueMediaId
        );
        if (!item) return false;
        const index =
            getRockIt().userManager.queueType === EQueueType.RANDOM
                ? (item.randomIndex ?? -1)
                : (item.sortedIndex ?? -1);
        return (
            index >= 0 &&
            index >= this._queueTotalAtom.get() - AUTOPLAY_NEAR_END_OFFSET
        );
    }

    /** Only the active playback owner may request preparation. Each request
     * refreshes file state; the server owns global admission and deduplication. */
    async prepareAutoplayAsync(): Promise<void> {
        if (!this._canPrepareAutoplay() || this._autoplayPreparing) return;
        const generation = this._lifecycleGeneration;
        this._autoplayPreparing = true;
        const currentId = this.currentQueueMediaId;
        const identity = this.queueIdentity;
        try {
            await this.loadAutoplaySuggestionsAsync();
            if (
                !this._canPrepareAutoplay() ||
                generation !== this._lifecycleGeneration ||
                this.queueIdentity !== identity ||
                currentId !== this.currentQueueMediaId
            )
                return;
            const currentItem = this.queue.find(
                (item) => item.queueMediaId === currentId
            );
            const index = currentItem
                ? getRockIt().userManager.queueType === EQueueType.RANDOM
                    ? (currentItem.randomIndex ?? -1)
                    : (currentItem.sortedIndex ?? -1)
                : -1;
            const count = recommendationWindowSize(
                this._queueTotalAtom.get() - index - 1
            );
            const window = this._autoplayRecommendationsAtom
                .get()
                .slice(0, count);
            if (window.length === 0) return;
            const response = await getRockIt().http.prepareRecommendations({
                publicIds: window.flatMap((item) =>
                    item.kind === "song" ? [item.song.publicId] : []
                ),
                discover: window.flatMap((item) =>
                    item.kind === "discover"
                        ? [
                              {
                                  artist: item.item.artists[0]?.name ?? "",
                                  track: item.item.name,
                              },
                          ]
                        : []
                ),
            });
            if (
                !response.isOk() ||
                generation !== this._lifecycleGeneration ||
                this.queueIdentity !== identity ||
                currentId !== this.currentQueueMediaId
            )
                return;
            this._setRecommendations(
                this._autoplayRecommendationsAtom.get().map((item) => {
                    if (item.kind === "song") {
                        const fresh = response.result.songs.find(
                            (song) => song.publicId === item.song.publicId
                        );
                        return fresh ? { kind: "song", song: fresh } : item;
                    }
                    const resolved = response.result.discover.find(
                        (entry) =>
                            entry.name === item.item.name &&
                            entry.artists[0]?.name ===
                                item.item.artists[0]?.name
                    );
                    const song = response.result.songs.find(
                        (entry) => entry.publicId === resolved?.publicId
                    );
                    return song ? { kind: "song", song } : item;
                })
            );
        } finally {
            if (generation === this._lifecycleGeneration) {
                this._autoplayPreparing = false;
            }
            if (
                generation === this._lifecycleGeneration &&
                this._canPrepareAutoplay()
            ) {
                this._autoplayPrepareTimer = setTimeout((): void => {
                    if (generation !== this._lifecycleGeneration) return;
                    this._autoplayPrepareTimer = undefined;
                    void this.prepareAutoplayAsync();
                }, 15000);
            }
        }
    }

    /** Append one ready song at a time. Pending/failed downloads never block
     * an already playable local fallback, and the original queue stays intact. */
    async startAutoplayAsync(): Promise<boolean> {
        if (getRockIt().userManager.repeatModeAtom.get() !== ERepeatMode.OFF)
            return false;
        const generation = this._lifecycleGeneration;
        const currentId = this.currentQueueMediaId;
        const identity = this.queueIdentity;
        const wasPlaying = getRockIt().mediaPlayerManager.playingAtom.get();
        await this.loadAutoplaySuggestionsAsync();
        if (
            generation !== this._lifecycleGeneration ||
            this.queueIdentity !== identity ||
            currentId !== this.currentQueueMediaId ||
            (wasPlaying && !getRockIt().mediaPlayerManager.playingAtom.get()) ||
            getRockIt().userManager.repeatModeAtom.get() !== ERepeatMode.OFF
        )
            return false;
        const items = this._autoplayRecommendationsAtom.get();
        const queued = new Set(this.queue.map((item) => item.media.publicId));
        const next = items.find(
            (item) =>
                item.kind === "song" &&
                item.song.downloaded &&
                !queued.has(item.song.publicId)
        );
        if (!next || next.kind !== "song") return false;
        this.addMediaToEnd(next.song);
        this._setRecommendations(items.filter((item) => item !== next));
        // Reuse the remaining recommendations instead of replacing them after
        // every track. Refill once the current batch has been consumed.
        this._autoplaySeedPublicId = this.queue.at(-1)?.media.publicId;
        if (this._autoplayRecommendationsAtom.get().length < 3)
            this._autoplaySeedPublicId = undefined;
        const appended = this.sortedQueue.at(-1);
        if (!appended) return false;
        this.setQueueMediaId(appended.queueMediaId, 1);
        this._sendCurrentQueue();
        return true;
    }

    // #endregion: Autoplay
}
