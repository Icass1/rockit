import { CurrentQueueMessageRequestItem, QueueResponseItem } from "@/dto";
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
import { Http } from "@/lib/http";
import { rockIt } from "@/lib/rockit/rockIt";
import { getAlbumAsync } from "@/lib/services/mediaService";
import { createArrayAtom, createAtom } from "@/lib/store";

export class QueueManager {
    // #region: Atoms

    private _currentMediaAtom = createAtom<TPlayableMedia | undefined>();
    private _currentListAtom = createAtom<string | undefined>();

    private _queueAtom = createArrayAtom<QueueResponseItem>([]);
    private _currentQueueMediaIdAtom = createAtom<number | null>(0);

    private sortedQueue: QueueResponseItem[] = [];
    private randomQueue: QueueResponseItem[] = [];

    // #endregion: Atoms

    // #region: Constructor

    constructor() {
        if (typeof window === "undefined") return;
    }

    async init() {
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

            this.randomQueue = response.result.queue.filter(
                (item) => item.queueType === "RANDOM"
            );
            this.sortedQueue = response.result.queue.filter(
                (item) => item.queueType === "SORTED"
            );

            if (response.result.queueType === "RANDOM")
                this._queueAtom.set(this.randomQueue);
            else if (response.result.queueType === "SORTED")
                this._queueAtom.set(this.sortedQueue);

            const currentMedia = this._queueAtom
                .get()
                .find(
                    (media) =>
                        media.queueMediaId ==
                        this._currentQueueMediaIdAtom.get()
                );

            this._currentMediaAtom.set(currentMedia?.media);
            this._currentListAtom.set(currentMedia?.listPublicId);
            rockIt.mediaPlayerManager.setMedia(true);
        }
    }

    // #endregion: Constructor

    // #region: Methods

    updateQueue() {
        const queueType = rockIt.userManager.queueTypeAtom.get();

        if (queueType === EQueueType.RANDOM)
            this._queueAtom.set(this.randomQueue);
        else if (queueType === EQueueType.SORTED)
            this._queueAtom.set(this.sortedQueue);

        const currentMedia = this._queueAtom
            .get()
            .find(
                (media) =>
                    media.queueMediaId == this._currentQueueMediaIdAtom.get()
            );

        this._currentMediaAtom.set(currentMedia?.media);
        this._currentListAtom.set(currentMedia?.listPublicId);
        rockIt.mediaPlayerManager.setMedia(true);
    }

    skipBack() {
        if (this.currentMedia?.publicId)
            rockIt.webSocketManager.sendSkipClicked({
                direction: "PREVIOUS",
                mediaPublicId: this.currentMedia.publicId,
            });
        const currentQueueMediaId = this.currentQueueMediaId;
        const queue = this.queue;

        const currentIndex = queue.findIndex(
            (item) => item.queueMediaId === currentQueueMediaId
        );

        const prevIndex = (currentIndex - 1 + queue.length) % queue.length;
        this.setQueueMediaId(queue[prevIndex].queueMediaId);
        rockIt.mediaPlayerManager.play();
    }

    skipForward() {
        if (this.currentMedia?.publicId)
            rockIt.webSocketManager.sendSkipClicked({
                direction: "NEXT",
                mediaPublicId: this.currentMedia.publicId,
            });
        const currentQueueMediaId = this.currentQueueMediaId;
        const queue = this.queue;

        const currentIndex = queue.findIndex(
            (item) => item.queueMediaId === currentQueueMediaId
        );

        const nextIndex = (currentIndex + 1) % queue.length;
        this.setQueueMediaId(queue[nextIndex].queueMediaId);
        rockIt.mediaPlayerManager.play();
    }

    setMedia(medias: TQueueMedia[], listPublicId: string) {
        this.sortedQueue = medias.map((media, index): QueueResponseItem => {
            return {
                media: media,
                listPublicId: listPublicId,
                queueType: EQueueType.SORTED,
                queueMediaId: index,
            };
        });

        this.randomQueue = medias.map((media, index): QueueResponseItem => {
            return {
                media: media,
                listPublicId: listPublicId,
                queueType: EQueueType.RANDOM,
                queueMediaId: index,
            };
        });

        const shuffle = (array) => {
            array.sort(() => Math.random() - 0.5);
        };

        shuffle(this.randomQueue);

        this.updateQueue();

        rockIt.webSocketManager.sendCurrentQueue({
            queue: [
                ...this.sortedQueue.map(
                    (item): CurrentQueueMessageRequestItem => {
                        return {
                            listPublicId: item.listPublicId,
                            mediaPublicId: item.media.publicId,
                            queueType: EQueueType.SORTED,
                            queueMediaId: item.queueMediaId,
                        };
                    }
                ),
                ...this.randomQueue.map(
                    (item): CurrentQueueMessageRequestItem => {
                        return {
                            listPublicId: item.listPublicId,
                            mediaPublicId: item.media.publicId,
                            queueType: EQueueType.RANDOM,
                            queueMediaId: item.queueMediaId,
                        };
                    }
                ),
            ],
        });
    }

    moveToMedia(publicId: string) {
        const media = this._queueAtom
            .get()
            .find((media) => media.media.publicId == publicId);
        if (!media) {
            rockIt.notificationManager.notifyError(
                "(moveToMedia) Media not found in queue."
            );
            return;
        }
        rockIt.webSocketManager.sendMediaClicked({ mediaPublicId: publicId });
        this._currentQueueMediaIdAtom.set(media.queueMediaId);
        this._currentMediaAtom.set(media.media);
        this._currentListAtom.set(media.listPublicId);
    }

    setQueueMediaId(queueMediaId: number) {
        this._currentQueueMediaIdAtom.set(queueMediaId);

        const queue = this._queueAtom.get();

        const media = queue.find((media) => media.queueMediaId == queueMediaId);

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
                if (queue[(index + i) % queue.length].media.downloaded) {
                    this.setQueueMediaId(index + i);
                    return;
                }
            }
        }

        this._currentMediaAtom.set(media.media);
        this._currentListAtom.set(media.listPublicId);
    }

    setCurrentList(currentList: string | undefined) {
        this._currentListAtom.set(currentList);
    }

    clearCurrentMedia(): void {
        this._currentMediaAtom.set(undefined);
    }

    async addListToQueueTopAsync(media: TListMedia) {
        console.log(media);
        throw "(addListToQueueTopAsync) Not implemented method";
    }

    async addListToQueueRandomAsync(media: TListMedia) {
        console.log(media);
        throw "(addListToQueueRandomAsync) Not implemented method";
    }

    async addListToQueueBottomAsync(media: TListMedia) {
        console.log(media);
        throw "(addListToQueueBottomAsync) Not implemented method";
    }

    async playList(media: TListMedia) {
        const medias = await this.getListMediasAsync(media);

        if (medias.length == 0) return;

        rockIt.queueManager.setMedia(
            medias.filter((m) => isQueueable(m)),
            media.publicId
        );
        rockIt.queueManager.setQueueMediaId(0);
        rockIt.mediaPlayerManager.play();
        rockIt.queueManager.setMedia(
            medias.filter((m) => isQueueable(m)),
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

    addMediaNext(media: TPlayableMedia) {
        console.log(media);
        throw "(addMediaNext) Not implemented method";
    }

    addMediaToEnd(media: TPlayableMedia) {
        console.log(media);
        throw "(addMediaToEnd) Not implemented method";
    }

    // #endregion: Methods

    // #region: Getters

    get currentMediaAtom() {
        return this._currentMediaAtom.getReadonlyAtom();
    }

    get currentMedia() {
        return this._currentMediaAtom.get();
    }

    get currentListAtom() {
        return this._currentListAtom.getReadonlyAtom();
    }

    get currentList() {
        return this._currentListAtom.get();
    }

    get queueAtom() {
        return this._queueAtom.getReadonlyAtom();
    }

    get queue() {
        return this._queueAtom.get();
    }

    get currentQueueMediaIdAtom() {
        return this._currentQueueMediaIdAtom.getReadonlyAtom();
    }

    get currentQueueMediaId() {
        return this._currentQueueMediaIdAtom.get();
    }

    // #endregion: Getters
}
