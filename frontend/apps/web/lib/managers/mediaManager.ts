import { TMedia } from "@rockit/shared";
import { Http } from "@/lib/http";
import { rockIt } from "@/lib/rockit/rockIt";
import { createArrayAtom } from "@/lib/store";

export class MediaManager {
    private _likedMediaAtom = createArrayAtom<string>([]);

    getMedia(publicId: string) {
        return Http.getMedia(publicId);
    }

    async fetchLikedMedia() {
        const res = await Http.getLikedMedia();

        if (res.isOk()) {
            this._likedMediaAtom.set(res.result.media);
        } else {
            console.error("Error getting liked media", res.message, res.detail);
        }
    }

    async downloadMedia(media: TMedia) {
        await rockIt.downloaderManager.startDownloadAsync(
            media.publicId,
            media.name
        );
    }

    async toggleLikeMedia(publicId: string) {
        const current = this._likedMediaAtom.get();
        const isLiked = current.includes(publicId);

        const res = await Http.likeMediaAsync({ publicIds: [publicId] });

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
