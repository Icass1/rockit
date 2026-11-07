import type { BaseHttp } from "@/http/baseHttp";
import type { BaseMediaPlayerManager } from "@/managers/baseMediaPlayerManager";
import type { BaseQueueManager } from "@/managers/baseQueueManager";
import type { BaseUserManager } from "@/managers/baseUserManager";
import type {
    INotificationManager,
    IVocabularyManager,
    IWebSocketManager,
} from "@/rockit/rockitRef";

export interface FriendServices {
    http: typeof BaseHttp;
    userManager: Pick<BaseUserManager, "sessionAtom">;
    webSocketManager: Pick<IWebSocketManager, "onMessage" | "offMessage">;
    notificationManager: Pick<
        INotificationManager,
        "notifyError" | "notifySuccess"
    >;
    vocabularyManager: IVocabularyManager;
}
export interface ListenTogetherServices extends FriendServices {
    queueManager: Pick<
        BaseQueueManager,
        | "currentMediaAtom"
        | "currentMedia"
        | "captureListeningQueue"
        | "restoreListeningQueue"
        | "setMedia"
        | "moveToMedia"
    >;
    mediaPlayerManager: Pick<
        BaseMediaPlayerManager,
        | "playingAtom"
        | "currentTimeAtom"
        | "currentTime"
        | "isPlaybackOwner"
        | "pause"
        | "play"
        | "setMedia"
        | "setCurrentTime"
    >;
    subscribeToResume?: (listener: () => void) => () => void;
}
