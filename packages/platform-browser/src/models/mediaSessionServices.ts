import type {
    BaseMediaPlayerManager,
    BaseQueueManager,
    ReadonlyAtom,
} from "@rockit/shared";

/** Browser controls consume generic playback owners, never desktop UI services. */
export interface MediaSessionServices {
    mediaPlayerManager: {
        nativePlayingRevisionAtom?: ReadonlyAtom<number>;
        nativePlaybackRevisionAtom?: ReadonlyAtom<number>;
    } & Pick<
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
