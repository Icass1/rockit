import type { BookmarkManager } from "@/lib/managers/bookmarkManager";
import type { MediaPlayerManager } from "@/lib/managers/mediaPlayerManager";
import type { PlayerUIManager } from "@/lib/managers/playerUIManager";
import type { QueueManager } from "@/lib/managers/queueManager";
import type { UserManager } from "@/lib/managers/userManager";

/** Stable references to the existing playback owners, without copying their state. */
export interface PlaybackServices {
    mediaPlayerManager: MediaPlayerManager;
    queueManager: QueueManager;
    userManager: UserManager;
    playerUIManager: PlayerUIManager;
    bookmarkManager: BookmarkManager;
}

export type MediaSessionServices = Pick<
    PlaybackServices,
    "mediaPlayerManager" | "queueManager"
>;
