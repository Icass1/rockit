import type { FriendServices } from "@/models/interfaces/friendServices";
import type { MediaPlayerManager } from "@/lib/managers/mediaPlayerManager";
import type { QueueManager } from "@/lib/managers/queueManager";

export interface ListenTogetherServices extends FriendServices {
    queueManager: Pick<
        QueueManager,
        | "currentMediaAtom"
        | "currentMedia"
        | "captureListeningQueue"
        | "restoreListeningQueue"
        | "setMedia"
        | "moveToMedia"
    >;
    mediaPlayerManager: Pick<
        MediaPlayerManager,
        | "playingAtom"
        | "currentTimeAtom"
        | "currentTime"
        | "isPlaybackOwner"
        | "pause"
        | "play"
        | "setMedia"
        | "setCurrentTime"
    >;
}
