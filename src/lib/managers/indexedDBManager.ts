import { atom } from "nanostores";

export class IndexedDBManager {
    // #region: Atoms

    private _songsInIndexedDBAtom = atom<string[]>([]);

    // #endregion: Atoms

    // #region: Constructor

    constructor() {}

    // #endregion: Constructor

    // #region: Methods

    async downloadListToDeviceAsync(
        type: "album" | "playlist",
        publicId: string,
        internalImageUrl?: string
    ) {
        console.log(type, publicId, internalImageUrl);
        throw "Not implemented method";
    }

    // #endregion: Methods

    // #region: Getters

    get songsInIndexedDBAtom() {
        return this._songsInIndexedDBAtom;
    }

    // #endregion: Getters
}
