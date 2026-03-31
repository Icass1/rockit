import { BaseSongWithAlbumResponse } from "@rockit/shared";
import { createArrayAtom } from "@/lib/store";

export class CurrentListManager {
    private _currentListSongsAtom = createArrayAtom<BaseSongWithAlbumResponse>(
        []
    );

    setCurrentListSongs(songs: BaseSongWithAlbumResponse[]) {
        this._currentListSongsAtom.set(songs);
    }

    clearCurrentList() {
        this._currentListSongsAtom.set([]);
    }

    get currentListSongsAtom() {
        return this._currentListSongsAtom.getReadonlyAtom();
    }

    get currentListSongs() {
        return this._currentListSongsAtom.get();
    }
}
