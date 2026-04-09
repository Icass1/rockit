import {
    LikedMediaResponseSchema,
    LikeMediaRequestSchema,
} from "@rockit/shared";
import { rockIt } from "@/lib/rockit/rockIt";
import { createArrayAtom } from "@/lib/store";
import { apiFetch, apiPostFetch } from "@/lib/utils/apiFetch";

export class MediaManager {
    private _likedMediaAtom = createArrayAtom<string>([]);

    async fetchLikedMedia() {
        const res = await apiFetch(
            "/user/liked-media",
            LikedMediaResponseSchema
        );

        if (res.isOk()) {
            this._likedMediaAtom.set(res.result.media);
        } else {
            console.error("Error getting liked media", res.message, res.detail);
        }
    }

    async toggleLikeMedia(publicId: string) {
        const current = this._likedMediaAtom.get();
        const isLiked = current.includes(publicId);

        const res = await apiPostFetch(
            `/user/like/media`,
            LikeMediaRequestSchema,
            LikedMediaResponseSchema,
            {
                publicIds: [publicId],
            }
        );

        if (res.isOk()) {
            this._likedMediaAtom.set(
                isLiked
                    ? current.filter((id) => id !== publicId)
                    : [...current, publicId]
            );
        } else {
            if (isLiked)
                rockIt.notificationManager.notifyError(
                    rockIt.vocabularyManager.vocabulary.ERROR_UNLIKING_MEDIA
                );
            else
                rockIt.notificationManager.notifyError(
                    rockIt.vocabularyManager.vocabulary.ERROR_LIKING_MEDIA
                );
        }
    }

    get likedMediaAtom() {
        return this._likedMediaAtom;
    }
}
