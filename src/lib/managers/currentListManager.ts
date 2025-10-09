import { createArrayAtom } from "@/lib/store";
import { RockItSongWithAlbum } from "../rockit/rockItSongWithAlbum";
import { RockItSongPlaylist } from "../rockit/rockItSongPlaylist";

export class CurrentListManager {
    // #region: Atoms

    private _currentListSongsAtom = createArrayAtom<
        RockItSongWithAlbum | RockItSongPlaylist
    >([]);

    // #endregion: Atoms

    // #region: Constructor

    constructor() {}

    // #endregion: Constructor

    // #region: Methods

    setCurrentListSongs(songs: (RockItSongWithAlbum | RockItSongPlaylist)[]) {
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
