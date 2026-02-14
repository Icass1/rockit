import { createArrayAtom, createAtom } from "@/lib/store";
import { rockIt } from "@/lib/rockit/rockIt";

import { DBListType, QueueListType } from "@/types/rockIt";
import { RockItSongWithAlbum } from "../rockit/rockItSongWithAlbum";
import { RockItSongQueue } from "../rockit/rockItSongQueue";
import apiFetch from "@/lib/utils/apiFetch";
import { QueueResponse } from "@/responses/queueResponse";

export class QueueManager {
    // #region: Atoms

    private _currentSongAtom = createAtom<RockItSongWithAlbum | undefined>();
    private _currentListAtom = createAtom<
        { type: QueueListType; publicId: string } | undefined
    >();

    private _queueAtom = createArrayAtom<RockItSongQueue>([]);
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
            console.error("Queue response is undefined");
            return;
        }

        const responseParsed = QueueResponse.parse(await response.json());

        this._currentQueueSongIdAtom.set(responseParsed.currentQueueSongId);
        this._queueAtom.set(
            responseParsed.queue.map((queueElement): RockItSongQueue => {
                return {
                    song: RockItSongWithAlbum.fromResponse(queueElement.song),
                    queueSongId: queueElement.queueSongId,
                    list: queueElement.list,
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
        songs: RockItSongWithAlbum[],
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
                    list: { type: listType, publicId: listPublicId },
                    song,
                    queueSongId: index,
                };
            })
        );
    }

    moveToSong(publicId: string) {
        // console.log(this._queueAtom.get());

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

    setCurrentList(currentList: { type: QueueListType; publicId: string }) {
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
