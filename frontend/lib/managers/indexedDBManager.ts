import { BaseSongWithAlbumResponse, BaseVideoResponse } from "@/dto";
import { DBListType } from "@/types/rockIt";
import { createArrayAtom } from "@/lib/store";

export class IndexedDBManager {
    // #region: Atoms

    private _mediasInIndexedDBAtom = createArrayAtom<string>([]);

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

    saveMediaToIndexedDB(media: BaseSongWithAlbumResponse | BaseVideoResponse) {
        console.warn(media);
        throw "(downloadListToDeviceAsync) Method not implemented";
    }

    // #endregion: Methods

    // #region: Getters

    get mediasInIndexedDBAtom() {
        return this._mediasInIndexedDBAtom.getReadonlyAtom();
    }

    get mediasInIndexedDB() {
        return this._mediasInIndexedDBAtom.get();
    }

    // #endregion: Getters
}
