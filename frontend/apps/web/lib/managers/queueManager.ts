import { BaseQueueManager } from "@rockit/shared";
import { rockIt } from "@/lib/rockit/rockIt";

/**
 * Web queue manager. All logic lives in the shared BaseQueueManager; the
 * default album fetch (via the HTTP client) already matches web behavior, so
 * this is a thin platform subclass.
 */
export class QueueManager extends BaseQueueManager {
    async refreshAsync(): Promise<void> {
        await this._refreshQueueAsync();
        rockIt.webSocketManager.requestPlaybackState();
    }
}
