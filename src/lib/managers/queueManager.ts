import { RockItQueueSong, RockItSongWithAlbum } from "@/types/rockIt";
import { atom } from "nanostores";
import { rockIt } from "@/lib/rockit";

export class QueueManager {
    // #region: Atoms

    private _currentSongAtom = atom<RockItSongWithAlbum | undefined>();
    private _currentListAtom = atom<
        { type: string; publicId: string } | undefined
    >();

    private _queueAtom = atom<RockItQueueSong[]>([]);
    private _queueIndexAtom = atom<number>(0);

    // #endregion: Atoms

    // #region: Constructor

    constructor() {}

    // #endregion: Constructor

    // #region: Methods

    setSongs(
        songs: RockItSongWithAlbum[],
        listType: "album" | "playlist",
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

    // #endregion: Methods

    // #region: Getters

    get currentSongAtom() {
        return this._currentSongAtom;
    }
    get currentSong() {
        return this._currentSongAtom.get();
    }
    get currentListAtom() {
        return this._currentListAtom;
    }
    get queueAtom() {
        return this._queueAtom;
    }
    get queueIndexAtom() {
        return this._queueIndexAtom;
    }

    // #endregion: Getters
}
