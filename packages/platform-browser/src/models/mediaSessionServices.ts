import type { BaseMediaPlayerManager, BaseQueueManager } from "@rockit/shared";

/** Browser controls consume generic playback owners, never desktop UI services. */
export interface MediaSessionServices {
    mediaPlayerManager: Pick<
        BaseMediaPlayerManager,
        | "play"
        | "pause"
        | "setCurrentTime"
        | "currentTime"
        | "currentTimeAtom"
        | "playingAtom"
        | "loadingAtom"
    >;
    queueManager: Pick<
        BaseQueueManager,
        "skipBack" | "skipForward" | "currentMedia" | "currentMediaAtom"
    >;
}
