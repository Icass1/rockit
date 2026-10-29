import { HttpResult, MediaResponse, TMedia } from "@rockit/shared";
import { Http } from "@/lib/http";
import { rockIt } from "@/lib/rockit/rockIt";
import { ArrayAtom, createArrayAtom } from "@/lib/store";

export class MediaManager {
    private _likedMediaAtom = createArrayAtom<string>([]);

    getMedia(publicId: string): Promise<HttpResult<MediaResponse>> {
        return Http.getMediaAsync(publicId);
    }

    async fetchLikedMedia(): Promise<void> {
        const res = await Http.getLikedMedia();

        if (res.isOk()) {
            this._likedMediaAtom.set(res.result.media);
        } else {
            console.error("Error getting liked media", res.message, res.detail);
        }
    }

    async downloadMedia(media: TMedia): Promise<void> {
        await rockIt.downloaderManager.startDownloadAsync(
            media.publicId,
            media.name
        );
    }

    async toggleLikeMedia(publicId: string): Promise<void> {
        const current = this._likedMediaAtom.get();
        const isLiked = current.includes(publicId);

        const res = await Http.likeMediaAsync({ publicIds: [publicId] });

        if (res.isOk()) {
            this._likedMediaAtom.set(
                isLiked
                    ? current.filter((id): boolean => id !== publicId)
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

    get likedMediaAtom(): ArrayAtom<string> {
        return this._likedMediaAtom;
    }
}
