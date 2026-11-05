import {
    BACKEND_URL,
    BaseQueueManager,
    type QueueResponse,
} from "@rockit/shared";
import type { ListenTogetherQueueSnapshot } from "@/models/interfaces/listenTogetherState";
import { rockIt } from "@/lib/rockit/rockIt";
import { createAtom, type ReadonlyAtom } from "@/lib/store";

/**
 * Shared queue orchestration with browser caching for offline collection playback.
 */
export class QueueManager extends BaseQueueManager {
    private _readyAtom = createAtom(false);

    get readyAtom(): ReadonlyAtom<boolean> {
        return this._readyAtom.getReadonlyAtom();
    }

    protected override _applyQueueResponse(
        queue: QueueResponse,
        updateCurrentMedia = true
    ): void {
        super._applyQueueResponse(queue, updateCurrentMedia);
        this._readyAtom.set(true);
    }

    override updateQueue(shuffleRandom?: boolean): void {
        super.updateQueue(shuffleRandom);
        // Appends can change the next random item while the current one plays.
        // The player deduplicates requests for an already prepared source.
        if (rockIt.mediaPlayerManager.playingAtom.get())
            void rockIt.mediaPlayerManager.preloadNextTrack();
    }

    captureListeningQueue(): ListenTogetherQueueSnapshot {
        return {
            sorted: [...this.sortedQueue],
            random: [...this.randomQueue],
            currentQueueMediaId: this.currentQueueMediaId,
            time: rockIt.mediaPlayerManager.currentTime,
        };
    }

    restoreListeningQueue(snapshot: ListenTogetherQueueSnapshot): void {
        this.sortedQueue = [...snapshot.sorted];
        this.randomQueue = [...snapshot.random];
        this.updateQueue();
        if (
            snapshot.currentQueueMediaId !== null &&
            this.queue.some(
                (item) => item.queueMediaId === snapshot.currentQueueMediaId
            )
        ) {
            this.setQueueMediaId(snapshot.currentQueueMediaId);
        } else this.clearCurrentMedia();
    }

    protected override async cacheCollectionQueueAsync(
        publicId: string,
        queue: QueueResponse
    ): Promise<void> {
        if (typeof window === "undefined" || !("caches" in window)) return;
        const generation = this._lifecycleGeneration;
        try {
            const cache = await caches.open("rockit-collections");
            if (generation !== this._lifecycleGeneration) return;
            await cache.put(
                `${BACKEND_URL}/media/collection/${publicId}/playable`,
                new Response(JSON.stringify(queue), {
                    headers: { "Content-Type": "application/json" },
                })
            );
        } catch {
            // Offline caching is best-effort; playback should proceed.
        }
    }

    override reset(): void {
        super.reset();
        this._readyAtom.set(false);
    }
}
