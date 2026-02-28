import { BaseSongWithAlbumResponse } from "@/dto";
import { createArrayAtom } from "@/lib/store";

export class CurrentListManager {
    // #region: Atoms

    private _currentListSongsAtom = createArrayAtom<BaseSongWithAlbumResponse>(
        []
    );

    // #endregion: Atoms

    // #region: Constructor

    constructor() {}

    // #endregion: Constructor

    // #region: Methods

    setCurrentListSongs(songs: BaseSongWithAlbumResponse[]) {
        this._currentListSongsAtom.set(songs);
    }

    // #endregion: Methods

    // #region: Getters

    get currentListSongsAtom() {
        return this._currentListSongsAtom;
    }

    get currentListSongs() {
        return this._currentListSongsAtom.get();
    }

    // #endregion: Getters
}
