import { BaseSongWithAlbumResponse } from "@/dto";
import { createArrayAtom } from "@/lib/store";
import { apiFetch } from "@/lib/utils/apiFetch";

export class SongManager {
    // #region: Atoms

    private _likedSongsAtom = createArrayAtom<string>([]);

    // #endregion: Atoms

    // #region: Constructor

    constructor() {}

    // #endregion: Constructor

    // #region: Methods

    async fetchLikedSongs(): Promise<void> {
        const res = await apiFetch("/user/like");
        if (!res?.ok) return;
        const data: string[] = await res.json();
        this.likedSongsAtom.set(data);
    }

    async toggleLikeSong(songPublicId: string): Promise<void> {
        const current = this.likedSongsAtom.get();
        const isLiked = current.includes(songPublicId);

        this.likedSongsAtom.set(
            isLiked
                ? current.filter((id) => id !== songPublicId)
                : [...current, songPublicId]
        );

        const res = await apiFetch(`/user/like/song/${songPublicId}`, {
            method: isLiked ? "DELETE" : "PUT",
        });

        if (!res?.ok) {
            this.likedSongsAtom.set(current);
        }
    }

    playSong(song: BaseSongWithAlbumResponse) {
        console.log(song);
        throw new Error("Method not implemented.");
    }

    // #endregion: Constructor

    // #region: Getters

    get likedSongsAtom() {
        return this._likedSongsAtom;
    }

    // #endregion: Getters
}
