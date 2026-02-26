import { DBListType } from "@/types/rockIt";
import { SongWithAlbum } from "@/lib/rockit/songWithAlbum";
import { createArrayAtom } from "@/lib/store";

export class IndexedDBManager {
    // #region: Atoms

    private _songsInIndexedDBAtom = createArrayAtom<string>([]);

    // #endregion: Atoms

    // #region: Constructor

    constructor() {}

    // #endregion: Constructor

    // #region: Methods

    async downloadListToDeviceAsync(
        type: DBListType,
        publicId: string,
        internalImageUrl?: string
    ) {
        console.warn(type, publicId, internalImageUrl);
        throw "(downloadListToDeviceAsync) Method not implemented";
    }

    saveSongToIndexedDB(song: SongWithAlbum) {
        console.warn(song);
        throw "(downloadListToDeviceAsync) Method not implemented";
    }

    // #endregion: Methods

    // #region: Getters

    get songsInIndexedDBAtom() {
        return this._songsInIndexedDBAtom.getReadonlyAtom();
    }

    get songsInIndexedDB() {
        return this._songsInIndexedDBAtom.get();
    }

    // #endregion: Getters
}
