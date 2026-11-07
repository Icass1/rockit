import type { FriendServices } from "@/models/interfaces/friendServices";
import type { MediaManager } from "@/lib/managers/mediaManager";
import type { MediaPlayerManager } from "@/lib/managers/mediaPlayerManager";
import type { QueueManager } from "@/lib/managers/queueManager";

export interface SharingServices extends FriendServices {
    mediaManager: Pick<MediaManager, "getMedia">;
    queueManager: Pick<
        QueueManager,
        "addMediaToEnd" | "setMedia" | "moveToMedia"
    >;
    mediaPlayerManager: Pick<MediaPlayerManager, "play">;
}
