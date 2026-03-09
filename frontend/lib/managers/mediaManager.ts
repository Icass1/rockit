import { LikeMediaRequest } from "@/dto";
import { createArrayAtom } from "@/lib/store";
import { apiPostFetch, baseApiFetch } from "@/lib/utils/apiFetch";

export class MediaManager {
    // #region: Atoms

    private _likedMediaAtom = createArrayAtom<string>([]);

    // #endregion: Atoms

    // #region: Constructor

    constructor() {}

    // #endregion: Constructor

    // #region: Methods

    async fetchLikedMedia(): Promise<void> {
        const res = await baseApiFetch("/user/like");
        if (!res?.ok) return;
        const data: string[] = await res.json();
        this.likedMediaAtom.set(data);
    }

    async toggleLikeMedia(mediaPublicId: string): Promise<void> {
        const current = this.likedMediaAtom.get();
        const isLiked = current.includes(mediaPublicId);

        this.likedMediaAtom.set(
            isLiked
                ? current.filter((id) => id !== mediaPublicId)
                : [...current, mediaPublicId]
        );

        const res = await apiPostFetch<LikeMediaRequest>(`/user/like/media`, {
            publicIds: [mediaPublicId],
        });

        if (!res?.ok) {
            this.likedMediaAtom.set(current);
        }
    }

    // #endregion: Constructor

    // #region: Getters

    get likedMediaAtom() {
        return this._likedMediaAtom;
    }

    // #endregion: Getters
}
