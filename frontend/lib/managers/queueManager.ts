import {
    BaseSongWithAlbumResponse,
    CurrentQueueMessageRequestItem,
    QueueResponseItem,
    QueueResponseSchema,
} from "@/dto";
import { DBListType, QueueListType } from "@/types/rockIt";
import { rockIt } from "@/lib/rockit/rockIt";
import { createArrayAtom, createAtom } from "@/lib/store";
import { apiFetch } from "@/lib/utils/apiFetch";

export class QueueManager {
    // #region: Atoms

    private _currentSongAtom = createAtom<
        BaseSongWithAlbumResponse | undefined
    >();
    private _currentListAtom = createAtom<string | undefined>();

    private _queueAtom = createArrayAtom<QueueResponseItem>([]);
    private _currentQueueSongIdAtom = createAtom<number | null>(0);
    private _originalQueue: QueueResponseItem[] = [];

    // #endregion: Atoms

    // #region: Constructor

    constructor() {
        if (typeof window === "undefined") return;
    }

    async init() {
        if (typeof window === "undefined") return;
        const response = await apiFetch("/user/queue");

        if (!response) {
            rockIt.notificationManager.notifyError("Failed to load queue.");
            return;
        }
        if (response.status != 200) {
            rockIt.notificationManager.notifyError("Failed to load queue.");
            return;
        }

        const responseParsed = QueueResponseSchema.parse(await response.json());

        this._currentQueueSongIdAtom.set(responseParsed.currentQueueSongId);
        this._queueAtom.set(
            responseParsed.queue.map((queueElement): QueueResponseItem => {
                return {
                    song: queueElement.song,
                    queueSongId: queueElement.queueSongId,
                    listPublicId: queueElement.listPublicId,
                };
            })
        );

        const currentSong = this._queueAtom
            .get()
            .find(
                (song) => song.queueSongId == this._currentQueueSongIdAtom.get()
            );

        this._currentSongAtom.set(currentSong?.song);
        this._currentListAtom.set(currentSong?.listPublicId);
    }

    // #endregion: Constructor

    // #region: Methods

    skipBack() {
        rockIt.webSocketManager.sendSkipClicked({
            direction: "previous",
            mediaPublicId: "TODO",
        });
        const currentQueueSongId = this.currentQueueSongId;
        const queue = this.queue;

        const currentIndex = queue.findIndex(
            (item) => item.queueSongId === currentQueueSongId
        );

        if (currentIndex > 0) {
            this.setQueueSongId(queue[currentIndex - 1].queueSongId);
            rockIt.audioManager.play();
        }
    }

    skipForward() {
        rockIt.webSocketManager.sendSkipClicked({
            direction: "next",
            mediaPublicId: "TODO",
        });
        const currentQueueSongId = this.currentQueueSongId;
        const queue = this.queue;

        const currentIndex = queue.findIndex(
            (item) => item.queueSongId === currentQueueSongId
        );

        const nextIndex = currentIndex + 1;
        if (nextIndex < queue.length) {
            this.setQueueSongId(queue[nextIndex].queueSongId);
            rockIt.audioManager.play();
        }
    }

    setSongs(
        songs: BaseSongWithAlbumResponse[],
        listType: QueueListType,
        listPublicId: string
    ) {
        const queueData: CurrentQueueMessageRequestItem[] = songs.map(
            (song, index): CurrentQueueMessageRequestItem => {
                return {
                    publicId: song.publicId,
                    queueIndex: index,
                };
            }
        );

        rockIt.webSocketManager.sendCurrentQueue({
            queue: queueData,
            queueType: "SORTED",
        });

        this._queueAtom.set(
            songs.map((song, index) => {
                return {
                    listPublicId: listPublicId,
                    song,
                    queueSongId: index,
                };
            })
        );
    }

    moveToSong(publicId: string) {
        const song = this._queueAtom
            .get()
            .find((song) => song.song.publicId == publicId);
        if (!song) {
            rockIt.notificationManager.notifyError(
                "(moveToSong) Song not found in queue."
            );
            return;
        }
        rockIt.webSocketManager.sendMediaClicked({ mediaPublicId: publicId });
        this._currentQueueSongIdAtom.set(song.queueSongId);
        this._currentSongAtom.set(song.song);
        this._currentListAtom.set(song.listPublicId);
    }

    setQueueSongId(queueSongId: number) {
        this._currentQueueSongIdAtom.set(queueSongId);

        const song = this._queueAtom
            .get()
            .find((song) => song.queueSongId == queueSongId);

        if (!song) {
            rockIt.notificationManager.notifyError(
                "(setIndex) Song not found in queue."
            );
            return;
        }
        this._currentSongAtom.set(song.song);
        this._currentListAtom.set(song.listPublicId);
    }

    setCurrentList(currentList: string | undefined) {
        this._currentListAtom.set(currentList);
    }

    clearCurrentSong(): void {
        this._currentSongAtom.set(undefined);
    }

    async addListToTopAsync(type: DBListType, publicId: string) {
        console.log(type, publicId);
        throw "(addListToTopAsync) Not implemented method";
    }

    async addListRandomAsync(type: DBListType, publicId: string) {
        console.log(type, publicId);
        throw "(addListRandomAsync) Not implemented method";
    }

    async addListToBottomAsync(type: DBListType, publicId: string) {
        console.log(type, publicId);
        throw "(addListToBottomAsync) Not implemented method";
    }

    addSongNext(_song: BaseSongWithAlbumResponse) {
        // TODO: Implement backend - add song to play next
    }

    addSongToEnd(_song: BaseSongWithAlbumResponse) {
        // TODO: Implement backend - add song to end of queue
    }

    shuffleQueue() {
        const currentQueueSongId = this.currentQueueSongId;
        const currentQueue = this.queue;

        if (!currentQueue.length) return;

        this._originalQueue = [...currentQueue];

        // Fisher-Yates shuffle
        const shuffled = [...currentQueue];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }

        // Keep current song at the front
        const currentIndex = shuffled.findIndex(
            (item) => item.queueSongId === currentQueueSongId
        );
        if (currentIndex > 0) {
            [shuffled[0], shuffled[currentIndex]] = [
                shuffled[currentIndex],
                shuffled[0],
            ];
        }

        this._queueAtom.set(shuffled);
    }

    restoreOriginalQueue() {
        if (!this._originalQueue.length) return;

        const currentQueueSongId = this.currentQueueSongId;
        const restored = [...this._originalQueue];

        // Keep current song at the front
        const currentIndex = restored.findIndex(
            (item) => item.queueSongId === currentQueueSongId
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

    get currentSongAtom() {
        return this._currentSongAtom.getReadonlyAtom();
    }

    get currentSong() {
        return this._currentSongAtom.get();
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

    get currentQueueSongIdAtom() {
        return this._currentQueueSongIdAtom.getReadonlyAtom();
    }

    get currentQueueSongId() {
        return this._currentQueueSongIdAtom.get();
    }

    // #endregion: Getters
}
