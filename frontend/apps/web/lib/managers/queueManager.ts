import { CurrentQueueMessageRequestItem } from "@/dto";
import {
    EQueueType,
    isAlbum,
    isAlbumWithSongs,
    isPlaylist,
    isQueueable,
    TListMedia,
    TPlayableMedia,
    TQueueMedia,
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

    private sortedQueue: QueueItem[] = [];
    private randomQueue: QueueItem[] = [];

    // #endregion: Atoms

    // #region: Constructor

    constructor() {
        if (typeof window === "undefined") return;
    }

    async init(): Promise<void> {
        if (typeof window === "undefined") return;
        const response = await Http.getQueue();

        if (response.isNotOk()) {
            rockIt.notificationManager.notifyError(
                rockIt.vocabularyManager.vocabulary.ERROR_GETTING_QUEUE
            );
            return;
        }

        if (response.isOk()) {
            this._currentQueueMediaIdAtom.set(
                response.result.currentQueueMediaId
            );

            this.sortedQueue = [...response.result.queue]
                .sort((a, b): number => a.sortedIndex - b.sortedIndex)
                .map(({ ...item }): QueueItem => item);
            this.randomQueue = [...response.result.queue]
                .sort((a, b): number => a.randomIndex - b.randomIndex)
                .map(({ ...item }): QueueItem => item);

            if (response.result.queueType === "RANDOM")
                this._queueAtom.set(this.randomQueue);
            else if (response.result.queueType === "SORTED")
                this._queueAtom.set(this.sortedQueue);

            const currentMedia = this._queueAtom
                .get()
                .find(
                    (media): boolean =>
                        media.queueMediaId ===
                        this._currentQueueMediaIdAtom.get()
                );

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
            if (shuffleRandom) this.randomQueue = shuffle(this.randomQueue);
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

        this.updateQueue();

        this._sendCurrentQueue();
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

            if (!media.media.downloaded) {
                console.warn("Current media is not downloaded");
                const index = queue.indexOf(media);
                for (let i = 1; i < queue.length; i++) {
                    const nextIndex =
                        (index + direction * i + queue.length) % queue.length;
                    if (queue[nextIndex].media.downloaded) {
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
        console.log(media);
        throw "(addListToQueueTopAsync) Not implemented method";
    }

    async addListToQueueRandomAsync(media: TListMedia): Promise<void> {
        console.log(media);
        throw "(addListToQueueRandomAsync) Not implemented method";
    }

    async addListToQueueBottomAsync(media: TListMedia): Promise<void> {
        console.log(media);
        throw "(addListToQueueBottomAsync) Not implemented method";
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
        this._sendCurrentQueue();
    }

    addMediaNext(media: TPlayableMedia): void {
        console.log(media);
        throw "(addMediaNext) Not implemented method";
    }

    addMediaToEnd(media: TPlayableMedia): void {
        console.log(media);
        throw "(addMediaToEnd) Not implemented method";
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

    // #endregion: Getters
}
