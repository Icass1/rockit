import {
    BaseSongWithAlbumResponse,
    BaseVideoResponse,
    CurrentQueueMessageRequestItem,
    QueueResponseItem,
    QueueResponseSchema,
} from "@/dto";
import { shuffleQueue as shuffleQueueLogic } from "@rockit/shared";
import { PlayableMediaType } from "@/types/media";
import { ListType, QueueListType } from "@/types/rockIt";
import { rockIt } from "@/lib/rockit/rockIt";
import { createArrayAtom, createAtom } from "@/lib/store";
import { baseApiFetch } from "@/lib/utils/apiFetch";

export class QueueManager {
    // #region: Atoms

    private _currentMediaAtom = createAtom<PlayableMediaType | undefined>();
    private _currentListAtom = createAtom<string | undefined>();

    private _queueAtom = createArrayAtom<QueueResponseItem>([]);
    private _currentQueueMediaIdAtom = createAtom<number | null>(0);
    private _originalQueue: QueueResponseItem[] = [];

    // #endregion: Atoms

    // #region: Constructor

    constructor() {
        if (typeof window === "undefined") return;
    }

    async init() {
        if (typeof window === "undefined") return;
        const response = await baseApiFetch("/user/queue");

        if (!response) {
            rockIt.notificationManager.notifyError("Failed to load queue.");
            return;
        }
        if (response.status != 200) {
            rockIt.notificationManager.notifyError("Failed to load queue.");
            return;
        }

        const responseParsed = QueueResponseSchema.parse(await response.json());

        this._currentQueueMediaIdAtom.set(responseParsed.currentQueueMediaId);
        this._queueAtom.set(
            responseParsed.queue.map((queueElement): QueueResponseItem => {
                return {
                    media: queueElement.media,
                    queueMediaId: queueElement.queueMediaId,
                    listPublicId: queueElement.listPublicId,
                };
            })
        );

        const currentMedia = this._queueAtom
            .get()
            .find(
                (media) =>
                    media.queueMediaId == this._currentQueueMediaIdAtom.get()
            );

        this._currentMediaAtom.set(currentMedia?.media);
        this._currentListAtom.set(currentMedia?.listPublicId);
        rockIt.audioManager.setSong();
    }

    // #endregion: Constructor

    // #region: Methods

    skipBack() {
        rockIt.webSocketManager.sendSkipClicked({
            direction: "PREVIOUS",
            mediaPublicId: "TODO",
        });
        const currentQueueMediaId = this.currentQueueMediaId;
        const queue = this.queue;

        const currentIndex = queue.findIndex(
            (item) => item.queueMediaId === currentQueueMediaId
        );

        if (currentIndex > 0) {
            this.setQueueMediaId(queue[currentIndex - 1].queueMediaId);
            rockIt.audioManager.play();
        }
    }

    skipForward() {
        rockIt.webSocketManager.sendSkipClicked({
            direction: "NEXT",
            mediaPublicId: "TODO",
        });
        const currentQueueMediaId = this.currentQueueMediaId;
        const queue = this.queue;

        const currentIndex = queue.findIndex(
            (item) => item.queueMediaId === currentQueueMediaId
        );

        const nextIndex = currentIndex + 1;
        if (nextIndex < queue.length) {
            this.setQueueMediaId(queue[nextIndex].queueMediaId);
            rockIt.audioManager.play();
        }
    }

    setMedia(
        medias: PlayableMediaType[],
        _listType: QueueListType,
        listPublicId: string
    ) {
        const queueData: CurrentQueueMessageRequestItem[] = medias.map(
            (media, index): CurrentQueueMessageRequestItem => {
                return {
                    publicId: media.publicId,
                    queueMediaId: index,
                };
            }
        );

        rockIt.webSocketManager.sendCurrentQueue({
            queue: queueData,
            queueType: "SORTED",
        });

        const validMedias = medias.filter(
            (media): media is BaseSongWithAlbumResponse | BaseVideoResponse =>
                media.type === "song" || media.type === "video"
        );
        this._queueAtom.set(
            validMedias.map((media, index) => {
                return {
                    listPublicId: listPublicId,
                    media,
                    queueMediaId: index,
                };
            })
        );
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

        const media = this._queueAtom
            .get()
            .find((media) => media.queueMediaId == queueMediaId);

        if (!media) {
            rockIt.notificationManager.notifyError(
                "(setIndex) Media not found in queue."
            );
            return;
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

    async addListToTopAsync(type: ListType, publicId: string) {
        console.log(type, publicId);
        throw "(addListToTopAsync) Not implemented method";
    }

    async addListRandomAsync(type: ListType, publicId: string) {
        console.log(type, publicId);
        throw "(addListRandomAsync) Not implemented method";
    }

    async addListToBottomAsync(type: ListType, publicId: string) {
        void type;
        void publicId;
        throw "(addListToBottomAsync) Not implemented method";
    }

    addMediaNext(_media: PlayableMediaType) {
        void _media;
    }

    addMediaToEnd(_media: PlayableMediaType) {
        void _media;
    }

    shuffleQueue() {
        const currentQueueMediaId = this.currentQueueMediaId;
        const currentQueue = this.queue;

        if (!currentQueue.length) return;

        this._originalQueue = [...currentQueue];

        const queueItems = currentQueue.map((item) => ({
            publicId: item.media.publicId,
            queueMediaId: item.queueMediaId,
        }));

        const shuffledItems = shuffleQueueLogic(
            queueItems,
            currentQueueMediaId
        );

        const shuffled = shuffledItems.map((item) => {
            return currentQueue.find(
                (q) => q.queueMediaId === item.queueMediaId
            )!;
        });

        this._queueAtom.set(shuffled);
    }

    restoreOriginalQueue() {
        if (!this._originalQueue.length) return;

        const currentQueueMediaId = this.currentQueueMediaId;
        const restored = [...this._originalQueue];

        // Keep current media at the front
        const currentIndex = restored.findIndex(
            (item) => item.queueMediaId === currentQueueMediaId
        );
        if (currentIndex > 0) {
            [restored[0], restored[currentIndex]] = [
                restored[currentIndex],
                restored[0],
            ];
        }

        this._queueAtom.set(restored);
    }

    saveOriginalQueue() {
        this._originalQueue = [...this.queue];
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
