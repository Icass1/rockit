import type { MediaResponse } from "@/dto";
import type { BaseHttp } from "@/http/baseHttp";
import type { BaseMediaPlayerManager } from "@/managers/baseMediaPlayerManager";
import type { BaseQueueManager } from "@/managers/baseQueueManager";
import type { BaseUserManager } from "@/managers/baseUserManager";
import type {
    INotificationManager,
    IVocabularyManager,
    IWebSocketManager,
} from "@/rockit/rockitRef";
import type { HttpResult } from "@/models/types/httpTypes";

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

export interface SharingServices extends FriendServices {
    mediaManager: {
        getMedia(publicId: string): Promise<HttpResult<MediaResponse>>;
    };
    queueManager: Pick<
        BaseQueueManager,
        "addMediaToEnd" | "setMedia" | "moveToMedia"
    >;
    mediaPlayerManager: Pick<BaseMediaPlayerManager, "play">;
}

export interface NavigationPinsServices extends Pick<
    FriendServices,
    "http" | "userManager" | "notificationManager" | "vocabularyManager"
> {
    subscribeToResume?: (listener: () => void) => () => void;
}
