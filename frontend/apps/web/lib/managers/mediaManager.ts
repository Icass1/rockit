import { LikeMediaRequest } from "@rockit/shared";
import { createArrayAtom } from "@/lib/store";
import { apiPostFetch, baseApiFetch } from "@/lib/utils/apiFetch";

export class MediaManager {
    private _likedMediaAtom = createArrayAtom<string>([]);

    async fetchLikedMedia() {
        const res = await baseApiFetch("/user/like");
        if (!res?.ok) return;
        const data: string[] = await res.json();
        this._likedMediaAtom.set(data);
    }

    async toggleLikeMedia(publicId: string) {
        const current = this._likedMediaAtom.get();
        const isLiked = current.includes(publicId);

        this._likedMediaAtom.set(
            isLiked
                ? current.filter((id) => id !== publicId)
                : [...current, publicId]
        );

        const res = await apiPostFetch<LikeMediaRequest>(`/user/like/media`, {
            publicIds: [publicId],
        });

        if (!res?.ok) {
            this._likedMediaAtom.set(current);
        }
    }

    get likedMediaAtom() {
        return this._likedMediaAtom;
    }
}
