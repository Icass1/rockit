import { RockItSongWithAlbum } from "@/types/rockIt";
import { atom } from "nanostores";

export class CurrentListManager {
    // #region: Atoms

    private _currentListSongsAtom = atom<RockItSongWithAlbum[]>([]);

    // #endregion: Atoms

    // #region: Constructor

    constructor() {}

    // #endregion: Constructor

    // #region: Methods

    setCurrentListSongs(songs: RockItSongWithAlbum[]) {
        this._currentListSongsAtom.set(songs);
    }

    // #endregion: Methods

    // #region: Getters

    get currentListSongsAtom() {
        return this._currentListSongsAtom;
    }

    // #endregion: Getters
}
