import { createArrayAtom, createAtom } from "@/lib/store";
import { rockIt } from "@/lib/rockit/rockIt";

import { DBListType, QueueListType } from "@/types/rockIt";
import { RockItSongWithAlbum } from "../rockit/rockItSongWithAlbum";
import { RockItSongQueue } from "../rockit/rockItSongQueue";

export class QueueManager {
    // #region: Atoms

    private _currentSongAtom = createAtom<RockItSongWithAlbum | undefined>();
    private _currentListAtom = createAtom<
        { type: QueueListType; publicId: string } | undefined
    >();

    private _queueAtom = createArrayAtom<RockItSongQueue>([]);
    private _queueIndexAtom = createAtom<number>(0);

    // #endregion: Atoms

    // #region: Constructor

    constructor() {}

    // #endregion: Constructor

    // #region: Methods

    setSongs(
        songs: RockItSongWithAlbum[],
        listType: QueueListType,
        listPublicId: string
    ) {
        this._queueAtom.set(
            songs.map((song, index) => {
                return {
                    list: { type: listType, publicId: listPublicId },
                    song,
                    index: index,
                };
            })
        );
    }

    moveToSong(publicId: string) {
        console.log(this._queueAtom.get());

        const song = this._queueAtom
            .get()
            .find((song) => song.song.publicId == publicId);
        if (!song) {
            rockIt.notificationManager.notifyError(
                "(moveToSong) Song not found in queue."
            );
            return;
        }
        this._queueIndexAtom.set(song.index);
        this._currentSongAtom.set(song.song);
    }

    setIndex(index: number) {
        this._queueIndexAtom.set(index);
        const song = this._queueAtom.get().find((song) => song.index == index);

        if (!song) {
            rockIt.notificationManager.notifyError(
                "(setIndex) Song not found in queue."
            );
            return;
        }
        this._currentSongAtom.set(song.song);
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

    get queueIndexAtom() {
        return this._queueIndexAtom.getReadonlyAtom();
    }

    get queueIndex() {
        return this._queueIndexAtom.get();
    }

    // #endregion: Getters
}
