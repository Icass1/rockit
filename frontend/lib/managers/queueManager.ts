import { QueueResponseSchema } from "@/dto";
import { DBListType, QueueListType } from "@/types/rockIt";
import { rockIt } from "@/lib/rockit/rockIt";
import { SongQueue } from "@/lib/rockit/songQueue";
import { SongWithAlbum } from "@/lib/rockit/songWithAlbum";
import { createArrayAtom, createAtom } from "@/lib/store";
import apiFetch from "@/lib/utils/apiFetch";

export class QueueManager {
    // #region: Atoms

    private _currentSongAtom = createAtom<SongWithAlbum | undefined>();
    private _currentListAtom = createAtom<string | undefined>();

    private _queueAtom = createArrayAtom<SongQueue>([]);
    private _currentQueueSongIdAtom = createAtom<number | null>(0);

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
            responseParsed.queue.map((queueElement): SongQueue => {
                return {
                    song: SongWithAlbum.fromResponse(queueElement.song),
                    queueSongId: queueElement.queueSongId,
                    list: queueElement.list.publicId,
                };
            })
        );

        const currentSong = this._queueAtom
            .get()
            .find(
                (song) => song.queueSongId == this._currentQueueSongIdAtom.get()
            );

        this._currentSongAtom.set(currentSong?.song);
        this._currentListAtom.set(currentSong?.list);
    }

    // #endregion: Constructor

    // #region: Methods

    skipBack() {}

    skipForward() {}

    setSongs(
        songs: SongWithAlbum[],
        listType: QueueListType,
        listPublicId: string
    ) {
        rockIt.webSocketManager.send({
            queue: songs.map((song, index) => {
                return {
                    list: { type: listType, publicId: listPublicId },
                    song: song.publicId,
                    queueSongId: index,
                };
            }),
        });

        this._queueAtom.set(
            songs.map((song, index) => {
                return {
                    list: listPublicId,
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
        rockIt.webSocketManager.send({ queueSongId: song.queueSongId });
        this._currentQueueSongIdAtom.set(song.queueSongId);
        this._currentSongAtom.set(song.song);
        this._currentListAtom.set(song.list);
    }

    setQueueSongId(queueSongId: number) {
        this._currentQueueSongIdAtom.set(queueSongId);
        rockIt.webSocketManager.send({ queueSongId: queueSongId });

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
        this._currentListAtom.set(song.list);
    }

    setCurrentList(currentList: string | undefined) {
        this._currentListAtom.set(currentList);
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
