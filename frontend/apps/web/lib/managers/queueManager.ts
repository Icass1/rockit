import {
    BACKEND_URL,
    BaseQueueManager,
    type QueueResponse,
} from "@rockit/shared";
import type { ListenTogetherQueueSnapshot } from "@/models/interfaces/listenTogetherState";
import { rockIt } from "@/lib/rockit/rockIt";

/**
 * Shared queue orchestration with browser caching for offline collection playback.
 */
export class QueueManager extends BaseQueueManager {
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
        try {
            const cache = await caches.open("rockit-collections");
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

    async refreshAsync(): Promise<void> {
        await this._refreshQueueAsync();
        rockIt.webSocketManager.requestPlaybackState();
    }
}
