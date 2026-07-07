import {
    type BaseAlbumWithSongsResponse,
    type CurrentMediaMessage,
    type CurrentQueueMessageRequestItem,
} from "../dto";
import {
    createArrayAtom,
    createAtom,
    type ReadonlyArrayAtom,
    type ReadonlyAtom,
} from "../lib/store";
import { EQueueType } from "../models/enums/queueType";
import { type QueueMediaItem } from "../models/interfaces/queue";
import {
    isAlbum,
    isAlbumWithSongs,
    isPlaylist,
    isQueueable,
    isStation,
    type TListMedia,
    type TPlayableMedia,
    type TQueueMedia,
} from "../models/types/media";
import { EWebSocketMessage } from "../models/types/webSocketMessages";
import { getRockIt } from "../rockit/rockitRef";
import { shuffle } from "../utils/arrayTools";

/**
 * Shared queue orchestration. Contains no direct audio/video API — it drives
 * the media player through the registry and reads collaborators (websocket,
 * user, bookmark). Ported from the canonical web implementation.
 */
export class BaseQueueManager {
    // #region: Atoms

    protected _currentMediaAtom = createAtom<TPlayableMedia | undefined>();
    protected _currentListAtom = createAtom<string | undefined>();

    protected _queueAtom = createArrayAtom<QueueMediaItem>([]);
    protected _sortedQueueAtom = createArrayAtom<QueueMediaItem>([]);
    protected _currentQueueMediaIdAtom = createAtom<number | null>(0);

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
    }

    protected _handleCurrentQueue = async (): Promise<void> => {
        await this._refreshQueueAsync(false);
    };

    protected _handleCurrentMedia = (data: CurrentMediaMessage): void => {
        const queue = this._queueAtom.get();
        const item = queue.find(
            (item): boolean =>
                item.queueMediaId === data.queueMediaId ||
                item.media.publicId === data.mediaPublicId
        );

        if (item) {
            this._currentQueueMediaIdAtom.set(data.queueMediaId);
            this._currentMediaAtom.set(item.media);
            this._currentListAtom.set(item.listPublicId ?? undefined);
            getRockIt().mediaPlayerManager.setMedia(true);
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
            getRockIt().mediaPlayerManager.setMedia(true);
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
        console.error("Error getting album", response.message, response.detail);
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

        const currentIndex = queue.findIndex(
            (item): boolean => item.queueMediaId === currentQueueMediaId
        );

        const nextIndex = (currentIndex + 1) % queue.length;
        this.setQueueMediaId(queue[nextIndex].queueMediaId);
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
            array.sort((): number => Math.random() - 0.5);
        };

        shuffleInPlace(this.randomQueue);

        const firstSortedId = this.sortedQueue[0]?.queueMediaId;
        if (firstSortedId !== undefined) {
            const firstRandomIndex = this.randomQueue.findIndex(
                (item): boolean => item.queueMediaId === firstSortedId
            );
            if (firstRandomIndex > 0) {
                const tmp = this.randomQueue[0];
                this.randomQueue[0] = this.randomQueue[firstRandomIndex];
                this.randomQueue[firstRandomIndex] = tmp;
            }
        }

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
        this._currentQueueMediaIdAtom.set(media.queueMediaId);
        this._currentMediaAtom.set(media.media);
        this._currentListAtom.set(media.listPublicId ?? undefined);
    }

    setQueueMediaId(): void;
    setQueueMediaId(queueMediaId: number, direction?: 1 | -1): void;
    setQueueMediaId(queueMediaId?: number, direction: 1 | -1 = 1): void {
        if (typeof queueMediaId === "number") {
            this._currentQueueMediaIdAtom.set(queueMediaId);

            const queue = this._queueAtom.get();

            const media = queue.find(
                (media): boolean => media.queueMediaId === queueMediaId
            );

            if (!media) {
                getRockIt().notificationManager.notifyError(
                    "(setIndex) Media not found in queue."
                );
                return;
            }

            if (!isStation(media.media) && !media.media.downloaded) {
                console.warn("Current media is not downloaded");
                const index = queue.indexOf(media);
                for (let i = 1; i < queue.length; i++) {
                    const nextIndex =
                        (index + direction * i + queue.length) % queue.length;
                    const nextMedia = queue[nextIndex].media;
                    if (
                        isStation(nextMedia) ||
                        ("downloaded" in nextMedia && nextMedia.downloaded)
                    ) {
                        this.setQueueMediaId(
                            queue[nextIndex].queueMediaId,
                            direction
                        );
                        return;
                    }
                }
            }

            this._currentMediaAtom.set(media.media);
            this._currentListAtom.set(media.listPublicId ?? undefined);
        } else {
            if (getRockIt().userManager.queueType === EQueueType.RANDOM) {
                this.setQueueMediaId(
                    Math.floor(Math.random() * this.queue.length)
                );
            } else if (
                getRockIt().userManager.queueType === EQueueType.SORTED
            ) {
                this.setQueueMediaId(0);
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

    async playList(media: TListMedia): Promise<void> {
        const medias = await this.getListMediasAsync(media);

        if (medias.length === 0) return;

        this.setMedia(medias.filter(isQueueable), media.publicId);
        this.setQueueMediaId(0);
        getRockIt().mediaPlayerManager.play();
        this.setMedia(medias.filter(isQueueable), media.publicId);
        this.setQueueMediaId(0);
        getRockIt().mediaPlayerManager.play();
    }

    async getListMediasAsync(media: TListMedia): Promise<TPlayableMedia[]> {
        const medias: TPlayableMedia[] = [];

        if (isAlbumWithSongs(media)) {
            return media.songs;
        } else if (isAlbum(media)) {
            const album = await this.getAlbumAsync(media.publicId);

            if (album) {
                return album.songs;
            }
        } else if (isPlaylist(media)) {
            console.warn("playlist without songs");
        }

        return medias;
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
        this.randomQueue.splice(randomInsertIndex, 0, {
            ...newItem,
            queueMediaId: currentMaxId + 2,
        });

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
        this.randomQueue.push({ ...newItem, queueMediaId: currentMaxId + 2 });

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
        this.randomQueue.splice(randomInsertIndex, 0, {
            ...newItem,
            queueMediaId: currentMaxId + 2,
        });

        this.updateQueue();
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

    // #endregion: Getters
}
