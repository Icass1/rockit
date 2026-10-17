import {
    BACKEND_URL,
    BaseQueueManager,
    type QueueResponse,
} from "@rockit/shared";
import { rockIt } from "@/lib/rockit/rockIt";

/**
 * Shared queue orchestration with browser caching for offline collection playback.
 */
export class QueueManager extends BaseQueueManager {
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
