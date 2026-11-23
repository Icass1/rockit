import {
    getMediaDuration,
    isQueueable,
    type TMedia,
} from "@/models/types/media";
import { rockIt } from "@/lib/rockit/rockIt";

export function parsePublicMediaTimestamp(
    value: string | null
): number | undefined {
    if (!value || !/^\d+(?:\.\d+)?$/.test(value)) return undefined;
    const seconds = Number(value);
    return Number.isFinite(seconds) ? seconds : undefined;
}

/** Internal links never depend on a provider URL or the sender's account. */
export function publicMediaPath(
    media: Pick<TMedia, "type" | "publicId">,
    timestamp?: number
): string {
    const id = encodeURIComponent(media.publicId);
    if (
        media.type === "album" ||
        media.type === "playlist" ||
        media.type === "artist"
    )
        return `/${media.type}/${id}`;
    const path = `/?media=${id}`;
    if (
        (media.type === "song" || media.type === "video") &&
        timestamp !== undefined &&
        Number.isFinite(timestamp) &&
        timestamp >= 0
    )
        return `${path}&t=${Math.floor(timestamp)}`;
    return path;
}

export async function copyPublicMediaLink(
    media: TMedia,
    timestamp?: number
): Promise<void> {
    const url = new URL(
        publicMediaPath(media, timestamp),
        window.location.origin
    ).href;
    try {
        await navigator.clipboard.writeText(url);
        rockIt.notificationManager.notifySuccess(
            rockIt.vocabularyManager.vocabulary.SHARING_LINK_COPIED
        );
    } catch {
        console.log(url);
        rockIt.notificationManager.notifyError(
            rockIt.vocabularyManager.vocabulary.SHARING_LINK_ERROR
        );
    }
}

export async function copyPublicMediaLinkAtCurrentTime(
    media: TMedia
): Promise<void> {
    if (
        (media.type !== "song" && media.type !== "video") ||
        rockIt.queueManager.currentMedia?.publicId !== media.publicId
    )
        return;
    await copyPublicMediaLink(
        media,
        rockIt.mediaPlayerManager.currentTimeAtom.get()
    );
}

/** Wait for session and queue bootstrap before applying a URL selection. */
export async function openPublicMediaLink(
    publicId: string,
    isCurrent: () => boolean,
    timestamp?: number
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
    if (
        timestamp === undefined ||
        !Number.isFinite(timestamp) ||
        timestamp < 0 ||
        response.result.media.type === "station" ||
        rockIt.queueManager.currentMedia?.publicId !== publicId
    )
        return;

    const queueIdentity = rockIt.queueManager.queueIdentity;
    const queueMediaId = rockIt.queueManager.currentQueueMediaId;
    await rockIt.mediaPlayerManager.setMedia();
    if (
        !isCurrent() ||
        rockIt.queueManager.queueIdentity !== queueIdentity ||
        rockIt.queueManager.currentQueueMediaId !== queueMediaId ||
        rockIt.queueManager.currentMedia?.publicId !== publicId
    )
        return;
    const duration =
        rockIt.mediaPlayerManager.durationAtom.get() ||
        getMediaDuration(response.result.media);
    rockIt.mediaPlayerManager.setCurrentTime(
        duration && Number.isFinite(duration) && duration > 0
            ? Math.min(timestamp, duration)
            : timestamp
    );
}
