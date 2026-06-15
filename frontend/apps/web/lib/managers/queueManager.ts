import { CurrentQueueMessageRequestItem } from "@/dto";
import {
    EQueueType,
    EWebSocketMessage,
    isAlbum,
    isAlbumWithSongs,
    isPlaylist,
    isQueueable,
    isStation,
    TListMedia,
    TPlayableMedia,
    TQueueMedia,
    type CurrentMediaMessage,
} from "@rockit/shared";
import { QueueItem } from "@/models/interfaces/queue";
import { Http } from "@/lib/http";
import { rockIt } from "@/lib/rockit/rockIt";
import { getAlbumAsync } from "@/lib/services/mediaService";
import {
    createArrayAtom,
    createAtom,
    ReadonlyArrayAtom,
    ReadonlyAtom,
} from "@/lib/store";
import { shuffle } from "@/lib/utils/arrayTools";

export class QueueManager {
    // #region: Atoms

    private _currentMediaAtom = createAtom<TPlayableMedia | undefined>();
    private _currentListAtom = createAtom<string | undefined>();

    private _queueAtom = createArrayAtom<QueueItem>([]);
    private _currentQueueMediaIdAtom = createAtom<number | null>(0);

    private _lastNavigationDirection: 1 | -1 = 1;
    private _init = false;

    private sortedQueue: QueueItem[] = [];
    private randomQueue: QueueItem[] = [];

    // #endregion: Atoms

    // #region: Constructor

    constructor() {
        if (typeof window === "undefined") return;
    }

    async init(): Promise<void> {
        if (typeof window === "undefined") return;
        if (this._init) return;
        this._init = true;

        await this._refreshQueueAsync();

        rockIt.webSocketManager.onMessage(
            EWebSocketMessage.CurrentQueue,
            this._handleCurrentQueue
        );
        rockIt.webSocketManager.onMessage(
            EWebSocketMessage.CurrentMedia,
            this._handleCurrentMedia
        );
    }

    private _handleCurrentQueue = async (): Promise<void> => {
        await this._refreshQueueAsync(false);
    };

    private _handleCurrentMedia = (data: CurrentMediaMessage): void => {
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
            rockIt.mediaPlayerManager.setMedia(true);
        }
    };

    private async _refreshQueueAsync(
        updateCurrentMedia: boolean = true
    ): Promise<void> {
        const response = await Http.getQueue();

        if (response.isNotOk()) {
            rockIt.notificationManager.notifyError(
                rockIt.vocabularyManager.vocabulary.ERROR_GETTING_QUEUE
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
                .map(({ ...item }): QueueItem => item);
            this.randomQueue = [...response.result.queue]
                .sort((a, b): number => a.randomIndex - b.randomIndex)
                .map(({ ...item }): QueueItem => item);

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
            rockIt.mediaPlayerManager.setMedia(true);
        }
    }

    // #endregion: Constructor

    // #region: Methods

    updateQueue(shuffleRandom?: boolean): void {
        const queueType = rockIt.userManager.queueTypeAtom.get();

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
        this._sendCurrentQueue();
    }

    private _sendCurrentQueue(): void {
        const randomIndexByQueueMediaId = new Map<number, number>();
        this.randomQueue.forEach((item, index): void => {
            randomIndexByQueueMediaId.set(item.queueMediaId, index);
        });

        rockIt.webSocketManager.sendCurrentQueue({
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
        const jumped = rockIt.bookmarkManager.skipToPrevBookmark();
        if (jumped) return;

        const currentTime = rockIt.mediaPlayerManager.currentTimeAtom.get();
        if (currentTime !== null && currentTime >= 3) return;

        this._lastNavigationDirection = -1;
        if (this.currentMedia?.publicId)
            rockIt.webSocketManager.sendSkipClicked({
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
        rockIt.mediaPlayerManager.play();
    }

    skipForward(): void {
        const jumped = rockIt.bookmarkManager.skipToNextBookmark();
        if (jumped) return;

        this._lastNavigationDirection = 1;
        if (this.currentMedia?.publicId)
            rockIt.webSocketManager.sendSkipClicked({
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
        rockIt.mediaPlayerManager.play();
    }

    setMedia(medias: TQueueMedia[], listPublicId: string): void {
        this.sortedQueue = medias.map((media, index): QueueItem => {
            return {
                media: media,
                listPublicId: listPublicId,
                queueMediaId: index,
            };
        });

        this.randomQueue = medias.map((media, index): QueueItem => {
            return {
                media: media,
                listPublicId: listPublicId,
                queueMediaId: index,
            };
        });

        const shuffle = (array: QueueItem[]): void => {
            array.sort((): number => Math.random() - 0.5);
        };

        shuffle(this.randomQueue);

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
            rockIt.notificationManager.notifyError(
                "(moveToMedia) Media not found in queue."
            );
            return;
        }
        rockIt.webSocketManager.sendMediaClicked({ mediaPublicId: publicId });
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
                rockIt.notificationManager.notifyError(
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
            console.log(rockIt.userManager.queueType);
            if (rockIt.userManager.queueType === EQueueType.RANDOM) {
                this.setQueueMediaId(
                    Math.floor(Math.random() * this.queue.length)
                );
            } else if (rockIt.userManager.queueType === EQueueType.SORTED) {
                this.setQueueMediaId(0);
            } else {
                throw `Unkown queue type ${rockIt.userManager.queueType}`;
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
            (media, index): QueueItem => ({
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
            const newItem: QueueItem = {
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
            const newItem: QueueItem = {
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
            (media, index): QueueItem => ({
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

        rockIt.queueManager.setMedia(
            medias.filter(isQueueable),
            media.publicId
        );
        rockIt.queueManager.setQueueMediaId(0);
        rockIt.mediaPlayerManager.play();
        rockIt.queueManager.setMedia(
            medias.filter(isQueueable),
            media.publicId
        );
        rockIt.queueManager.setQueueMediaId(0);
        rockIt.mediaPlayerManager.play();
    }

    async getListMediasAsync(media: TListMedia): Promise<TPlayableMedia[]> {
        const medias: TPlayableMedia[] = [];

        if (isAlbumWithSongs(media)) {
            return media.songs;
        } else if (isAlbum(media)) {
            const album = await getAlbumAsync(media.publicId);

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
                rockIt.mediaPlayerManager.pause();
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

        const newItem: QueueItem = {
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

        const newItem: QueueItem = {
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

        const newItem: QueueItem = {
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

    get queueAtom(): ReadonlyArrayAtom<QueueItem> {
        return this._queueAtom.getReadonlyAtom();
    }

    get queue(): QueueItem[] {
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
