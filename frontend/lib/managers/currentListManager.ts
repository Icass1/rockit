import { createArrayAtom } from "@/lib/store";
import { SongPlaylist } from "../rockit/rockItSongPlaylist";
import { SongWithAlbum } from "../rockit/rockItSongWithAlbum";

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
