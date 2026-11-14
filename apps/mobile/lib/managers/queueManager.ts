import {
    BaseQueueManager,
    downloadCollectionOffline,
    getRockIt,
    isSong,
    type TPlayableMedia,
} from "@rockit/shared";
import { Http } from "@/lib/http";
import { mediaStorage } from "@/lib/storage/mediaStorage";
import { syncManager } from "@/lib/syncManager";

export class QueueManager extends BaseQueueManager {
    private offlineRequest = 0;
    override stop(): void {
        this.offlineRequest++;
        super.stop();
    }
    override async playCollection(
        publicId: string,
        startPublicId?: string,
        preview?: TPlayableMedia
    ): Promise<void> {
        const request = ++this.offlineRequest;
        const rockIt = getRockIt();
        if (syncManager.isOnline())
            return super.playCollection(publicId, startPublicId, preview);
        const session = rockIt.userManager.sessionAtom.get();
        const candidates: TPlayableMedia[] = [];
        try {
            // Reuse the same paged traversal used when saving the collection;
            // these are the snapshots guaranteed to exist after a download.
            await downloadCollectionOffline(Http, publicId, {
                isCurrent: () =>
                    request === this.offlineRequest &&
                    rockIt.userManager.sessionAtom.get() === session,
                save: async (song) => {
                    candidates.push(song);
                },
            });
        } catch {
            if (
                preview &&
                !candidates.some((song) => song.publicId === preview.publicId)
            )
                candidates.push(preview);
        }
        const saved = await Promise.all(
            candidates.map((media) =>
                isSong(media)
                    ? mediaStorage.hasMedia(media.publicId)
                    : Promise.resolve(false)
            )
        );
        if (
            request !== this.offlineRequest ||
            rockIt.userManager.sessionAtom.get() !== session
        )
            return;
        const songs = candidates.filter((_, index) => saved[index]);
        if (
            !songs.length ||
            (startPublicId &&
                !songs.some((song) => song.publicId === startPublicId))
        ) {
            rockIt.notificationManager.notifyError(
                rockIt.vocabularyManager.vocabulary.NO_OFFLINE_MEDIA
            );
            return;
        }
        this.setMedia(songs, publicId);
        if (startPublicId) this.moveToMedia(startPublicId);
        else this.setQueueMediaId();
        rockIt.mediaPlayerManager.play();
    }
}
