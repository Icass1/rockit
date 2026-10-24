import { isStation, type TPlayableMedia } from "@rockit/shared";
import { Http } from "@/lib/http";
import { rockIt } from "@/lib/rockit/rockIt";
import { expandPlaylistsToPlayable } from "@/lib/services/mediaService";
import { createAtom, type ReadonlyAtom } from "@/lib/store";

/** Owns progressive playback independently of the button's mount lifetime. */
export class LibraryPlaybackManager {
    private _loading = createAtom(false);

    get loadingAtom(): ReadonlyAtom<boolean> {
        return this._loading.getReadonlyAtom();
    }

    async playAsync(): Promise<void> {
        if (this._loading.get()) return;
        this._loading.set(true);
        try {
            const queue = rockIt.queueManager;
            let ownedQueue = queue.queueIdentity;
            const response = await Http.getUserLibraryMedias();
            if (queue.queueIdentity !== ownedQueue) return;
            if (!response.isOk()) throw new Error(response.message);
            let started = false;
            const pending: TPlayableMedia[] = [];
            const appendOrStart = (media: TPlayableMedia[]): void => {
                if (started) {
                    queue.appendMedias(media, "library");
                    return;
                }
                pending.push(...media);
                // Metadata alone is not a successful playback selection.
                if (!media.some((item) => isStation(item) || item.downloaded))
                    return;
                queue.setMedia(pending, "library");
                ownedQueue = queue.queueIdentity;
                queue.setQueueMediaId();
                started = true;
                pending.length = 0;
                rockIt.mediaPlayerManager.play();
            };
            appendOrStart([
                ...response.result.songs.map((entry) => entry.item),
                ...response.result.videos.map((entry) => entry.item),
            ]);
            const collections = [
                ...response.result.albums,
                ...response.result.playlists,
            ];
            let hadFailures = false;
            for (let offset = 0; offset < collections.length; offset += 4) {
                if (queue.queueIdentity !== ownedQueue) return;
                const media = await expandPlaylistsToPlayable(
                    collections
                        .slice(offset, offset + 4)
                        .map((entry) => entry.item),
                    () => {
                        hadFailures = true;
                    }
                );
                if (queue.queueIdentity !== ownedQueue) return;
                appendOrStart(media);
            }
            if (hadFailures || (!started && pending.length)) {
                rockIt.notificationManager.notifyWarn(
                    hadFailures
                        ? rockIt.vocabularyManager.vocabulary
                              .ERROR_GETTING_QUEUE
                        : rockIt.vocabularyManager.vocabulary
                              .MEDIA_NOT_DOWNLOADED
                );
            }
        } catch (error) {
            rockIt.notificationManager.notifyError(
                error instanceof Error ? error.message : String(error)
            );
        } finally {
            this._loading.set(false);
        }
    }
}
