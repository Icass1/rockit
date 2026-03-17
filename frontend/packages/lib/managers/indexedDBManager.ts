import { BaseSongWithAlbumResponse, BaseVideoResponse } from "@/packages/dto";
import { createArrayAtom } from "@/packages/lib/store";
import { DBListType } from "@/packages/types/rockIt";

export class IndexedDBManager {
    // #region: Atoms

    private _mediaInIndexedDBAtom = createArrayAtom<string>([]);

    // #endregion: Atoms

    // #region: Constructor

    constructor() {}

    // #endregion: Constructor

    // #region: Methods

    async downloadListToDeviceAsync(
        type: DBListType,
        publicId: string,
        imageUrl?: string
    ) {
        console.warn(type, publicId, imageUrl);
        throw "(downloadListToDeviceAsync) Method not implemented";
    }

    saveMediaToIndexedDB(media: BaseSongWithAlbumResponse | BaseVideoResponse) {
        console.warn(media);
        throw "(downloadListToDeviceAsync) Method not implemented";
    }

    // #endregion: Methods

    // #region: Getters

    get mediaInIndexedDBAtom() {
        return this._mediaInIndexedDBAtom.getReadonlyAtom();
    }

    get mediaInIndexedDB() {
        return this._mediaInIndexedDBAtom.get();
    }

    // #endregion: Getters
}
