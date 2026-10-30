import {
    buildRecommendationQueue,
    recommendationWindowSize,
} from "@/audio/recommendationQueue";
import {
    type BaseAlbumWithSongsResponse,
    type BaseSongWithAlbumResponse,
    type CurrentMediaMessage,
    type CurrentQueueMessageRequestItem,
    type QueueResponse,
} from "@/dto";
import { getRockIt } from "@/rockit/rockitRef";
import { shuffle } from "@/utils/arrayTools";
import { EQueueType } from "@/models/enums/queueType";
import { ERepeatMode } from "@/models/enums/repeatMode";
import { type QueueMediaItem } from "@/models/interfaces/queue";
import type { AutoplayRecommendation } from "@/models/types/autoplayRecommendation";
import {
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

    protected sortedQueue: QueueMediaItem[] = [];
    protected randomQueue: QueueMediaItem[] = [];

    // #endregion: Atoms

    // #region: Constructor

    async init(): Promise<void> {
        if (this._init) return;
        this._init = true;

        await this._refreshQueueAsync();

        getRockIt().webSocketManager.onMessage(
            EWebSocketMessage.CurrentQueue,
            this._handleCurrentQueue
        );
        getRockIt().webSocketManager.onMessage(
            EWebSocketMessage.CurrentMedia,
            this._handleCurrentMedia
        );
        getRockIt().webSocketManager.requestPlaybackState();

        // Refresh the suggestions as the queue plays, but only near its end —
        // that is the only moment they are consumed, and it turns a burst of
        // track changes into at most one request. The loader also no-ops while
        // the seed song is unchanged.
        this._currentMediaAtom.listen((): void => {
            this._scheduleAutoplayLoad();
        });
        getRockIt().mediaPlayerManager.playingAtom.listen((): void => {
            this._scheduleAutoplayLoad();
        });
        getRockIt().userManager.repeatModeAtom.listen((): void => {
            this._scheduleAutoplayLoad();
        });
        this._scheduleAutoplayLoad();
    }

    protected _handleCurrentQueue = async (): Promise<void> => {
        await this._refreshQueueAsync(false);
        getRockIt().webSocketManager.requestPlaybackState();
    };

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
    ): Promise<void> {
        const response = await getRockIt().http.getQueue();

        if (response.isNotOk()) {
            getRockIt().notificationManager.notifyError(
                getRockIt().vocabularyManager.vocabulary.ERROR_GETTING_QUEUE
            );
            return;
        }

        if (response.isOk()) {
            if (updateCurrentMedia)
                this._currentQueueMediaIdAtom.set(
                    response.result.currentQueueMediaId
                );

            this.sortedQueue = [...response.result.queue]
                .sort((a, b): number => a.sortedIndex - b.sortedIndex)
                .map(({ ...item }): QueueMediaItem => item);
            this.randomQueue = [...response.result.queue]
                .sort((a, b): number => a.randomIndex - b.randomIndex)
                .map(({ ...item }): QueueMediaItem => item);

            if (response.result.queueType === EQueueType.RANDOM)
                this._queueAtom.set(this.randomQueue);
            else if (response.result.queueType === EQueueType.SORTED)
                this._queueAtom.set(this.sortedQueue);

            const currentMedia = this._queueAtom
                .get()
                .find(
                    (media): boolean =>
                        media.queueMediaId ===
                        this._currentQueueMediaIdAtom.get()
                );

            if (updateCurrentMedia)
                this._currentMediaAtom.set(currentMedia?.media);
            this._currentListAtom.set(currentMedia?.listPublicId ?? undefined);
            if (updateCurrentMedia)
                void getRockIt().mediaPlayerManager.setMedia(true);
        }
    }

    // #endregion: Constructor

    // #region: Methods

    /**
     * Fetch the playable medias of a list. Default resolves albums through the
     * HTTP client; a platform subclass may override for local caching.
     */
    protected async getAlbumAsync(
        publicId: string
    ): Promise<BaseAlbumWithSongsResponse | undefined> {
        const response = await getRockIt().http.getAlbum(publicId);
        if (response.isOk()) {
            return response.result;
        }
        getRockIt().notificationManager.notifyError(
            getRockIt().vocabularyManager.vocabulary.ERROR_GETTING_ALBUM
        );
        return undefined;
    }

    updateQueue(shuffleRandom?: boolean): void {
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

        const nextIndex = (currentIndex + 1) % queue.length;
        this.setQueueMediaId(queue[nextIndex].queueMediaId, 1);
        getRockIt().mediaPlayerManager.play();
    }

    setMedia(medias: TQueueMedia[], listPublicId: string): void {
        this.sortedQueue = medias.map((media, index): QueueMediaItem => {
            return {
                media: media,
                listPublicId: listPublicId,
                queueMediaId: index,
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
        this._currentMediaAtom.set(undefined);
    }

    async addListToQueueTopAsync(media: TListMedia): Promise<void> {
        const medias = await this.getListMediasAsync(media);
        if (medias.length === 0) return;

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
        const medias = await this.getListMediasAsync(media);
        if (medias.length === 0) return;

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
        const medias = await this.getListMediasAsync(media);
        if (medias.length === 0) return;

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
        if (response.isNotOk()) {
            if (response.code === 0) {
                const cached =
                    await getRockIt().http.resolveCollectionQueue(publicId);
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
        this.sortedQueue = [...queue.queue].sort(
            (a, b) => a.sortedIndex - b.sortedIndex
        );
        this.randomQueue = [...queue.queue].sort(
            (a, b) => a.randomIndex - b.randomIndex
        );
        this._currentQueueMediaIdAtom.set(queue.currentQueueMediaId);
        this._sortedQueueAtom.set([...this.sortedQueue]);
        this._queueAtom.set(
            queue.queueType === EQueueType.RANDOM
                ? this.randomQueue
                : this.sortedQueue
        );
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
        const response = await getRockIt().http.resolveCollectionQueue(
            media.publicId
        );
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
        if (
            this.currentMedia?.publicId === song.publicId &&
            getRockIt().mediaPlayerManager.playingAtom.get()
        ) {
            getRockIt().mediaPlayerManager.pause();
            return;
        }
        const fresh = await getRockIt().http.getSong(song.publicId);
        if (!fresh.isOk()) {
            getRockIt().notificationManager.notifyError(fresh.message);
            return;
        }
        if (!fresh.result.downloaded) {
            const started = await getRockIt().http.startDownload({
                ids: [song.publicId],
                title: song.name,
            });
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
        const media = item.kind === "song" ? item.song : item.item;
        if (media.publicId && (item.kind === "song" || media.downloaded)) {
            const identity = this.queueIdentity;
            const fresh = await getRockIt().http.getSong(media.publicId);
            if (this.queueIdentity !== identity) return;
            if (!fresh.isOk()) {
                getRockIt().notificationManager.notifyError(fresh.message);
                return;
            }
            if (!fresh.result.downloaded) {
                const started = await getRockIt().http.startDownload({
                    ids: [media.publicId],
                    title: media.name,
                });
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
                false
            );
            if (
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
            // Discover is additive and never delays a playable local answer.
            void getRockIt()
                .http.getRelatedSongs(seed.publicId, 20, true)
                .then((external) => {
                    if (
                        !external.isOk() ||
                        this.queueIdentity !== identity ||
                        this._autoplaySeedPublicId !== seed.publicId ||
                        this.queue.at(-1)?.media.publicId !== seed.publicId
                    )
                        return;
                    const queued = new Set(
                        this.queue.map((item) => item.media.publicId)
                    );
                    this._setRecommendations(
                        buildRecommendationQueue(
                            {
                                ...external.result,
                                songs: this._autoplayRecommendationsAtom
                                    .get()
                                    .flatMap((item) =>
                                        item.kind === "song" ? [item.song] : []
                                    ),
                            },
                            queued
                        )
                    );
                });
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
        this._autoplayLoadTimer = setTimeout((): void => {
            this._autoplayLoadTimer = undefined;
            void this.prepareAutoplayAsync();
        }, AUTOPLAY_LOAD_DELAY_MS);
    }

    protected _isNearQueueEnd(): boolean {
        const index = this.queue.findIndex(
            (item) => item.queueMediaId === this.currentQueueMediaId
        );
        return (
            index >= 0 && index >= this.queue.length - AUTOPLAY_NEAR_END_OFFSET
        );
    }

    /** Only the active playback owner may request preparation. Each request
     * refreshes file state; the server owns global admission and deduplication. */
    async prepareAutoplayAsync(): Promise<void> {
        if (!this._canPrepareAutoplay() || this._autoplayPreparing) return;
        this._autoplayPreparing = true;
        const currentId = this.currentQueueMediaId;
        const identity = this.queueIdentity;
        try {
            await this.loadAutoplaySuggestionsAsync();
            if (
                !this._canPrepareAutoplay() ||
                this.queueIdentity !== identity ||
                currentId !== this.currentQueueMediaId
            )
                return;
            const index = this.queue.findIndex(
                (item) => item.queueMediaId === currentId
            );
            const count = recommendationWindowSize(
                this.queue.length - index - 1
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
            this._autoplayPreparing = false;
            if (this._canPrepareAutoplay()) {
                this._autoplayPrepareTimer = setTimeout((): void => {
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
        const currentId = this.currentQueueMediaId;
        const identity = this.queueIdentity;
        const wasPlaying = getRockIt().mediaPlayerManager.playingAtom.get();
        await this.loadAutoplaySuggestionsAsync();
        if (
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
