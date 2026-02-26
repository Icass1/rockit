import { SongPlaylist } from "@/lib/rockit/songPlaylist";
import { SongWithAlbum } from "@/lib/rockit/songWithAlbum";
import { createArrayAtom } from "@/lib/store";

export class CurrentListManager {
    // #region: Atoms

    private _currentListSongsAtom = createArrayAtom<
        SongWithAlbum | SongPlaylist
    >([]);

    // #endregion: Atoms

    // #region: Constructor

    constructor() {}

    // #endregion: Constructor

    // #region: Methods

    setCurrentListSongs(songs: SongWithAlbum[]) {
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
