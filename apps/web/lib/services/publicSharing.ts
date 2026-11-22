import { isQueueable, type TMedia } from "@/models/types/media";
import { rockIt } from "@/lib/rockit/rockIt";

/** Internal links never depend on a provider URL or the sender's account. */
export function publicMediaPath(
    media: Pick<TMedia, "type" | "publicId">
): string {
    const id = encodeURIComponent(media.publicId);
    if (
        media.type === "album" ||
        media.type === "playlist" ||
        media.type === "artist"
    )
        return `/${media.type}/${id}`;
    return `/?media=${id}`;
}

export async function copyPublicMediaLink(media: TMedia): Promise<void> {
    try {
        const url = new URL(publicMediaPath(media), window.location.origin)
            .href;
        await navigator.clipboard.writeText(url);
        rockIt.notificationManager.notifySuccess(
            rockIt.vocabularyManager.vocabulary.SHARING_LINK_COPIED
        );
    } catch {
        rockIt.notificationManager.notifyError(
            rockIt.vocabularyManager.vocabulary.SHARING_LINK_ERROR
        );
    }
}

/** Wait for session and queue bootstrap before applying a URL selection. */
export async function openPublicMediaLink(
    publicId: string,
    isCurrent: () => boolean
): Promise<void> {
    await rockIt.init();
    if (!isCurrent()) return;
    await rockIt.queueManager.init();
    if (!isCurrent()) return;
    const response = await rockIt.http.getMediaAsync(publicId);
    if (!isCurrent()) return;
    if (!response.isOk() || !isQueueable(response.result.media)) {
        rockIt.notificationManager.notifyError(
            rockIt.vocabularyManager.vocabulary.QUEUE_MEDIA_NOT_FOUND
        );
        return;
    }
    rockIt.mediaPlayerManager.pause();
    rockIt.queueManager.setMedia([response.result.media], "");
    rockIt.queueManager.moveToMedia(publicId);
    rockIt.playerUIManager.show();
}
