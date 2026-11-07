import type { MediaPlayerManager } from "@rockit/platform-browser/managers/mediaPlayerManager";
import type { BaseQueueManager, BaseUserManager } from "@rockit/shared";

export interface VolumePreferenceServices {
    userManager: Pick<BaseUserManager, "sessionAtom">;
    mediaPlayerManager: Pick<MediaPlayerManager, "volume" | "volumeAtom">;
}

export interface PlaybackServices extends VolumePreferenceServices {
    mediaPlayerManager: MediaPlayerManager;
    queueManager: BaseQueueManager;
}
