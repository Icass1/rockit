import type { SessionResponse } from "@/dto";
import type { Http } from "@/lib/api/browser";
import type { DownloaderManager } from "@/lib/managers/downloaderManager";
import type { NotificationManager } from "@/lib/managers/notificationManager";
import type { QueueManager } from "@/lib/managers/queueManager";
import type { SearchManager } from "@/lib/managers/searchManager";
import type { VocabularyManager } from "@/lib/managers/vocabularyManager";
import type { WebSocketManager } from "@/lib/managers/webSocketManger";

export interface UserSessionServices {
    http: Pick<
        typeof Http,
        | "getSession"
        | "logoutUser"
        | "uploadProfileImage"
        | "updateDownloadSettings"
        | "updateListeningHeatmap"
        | "updateLang"
    >;
    webSocketManager: Pick<
        WebSocketManager,
        "onMessage" | "offMessage" | "disconnect"
    >;
    notificationManager: Pick<
        NotificationManager,
        "notifyError" | "notifySuccess"
    >;
    vocabularyManager: Pick<
        VocabularyManager,
        "vocabulary" | "getVocabularyAsync" | "setVocabulary"
    >;
    searchManager: Pick<SearchManager, "clearResults">;
    downloaderManager: Pick<DownloaderManager, "reset">;
    queueManager: Pick<QueueManager, "updateQueue">;
    sessionCache: {
        load(): Promise<SessionResponse | null | undefined>;
        save(session: SessionResponse): Promise<void>;
        clear(): Promise<void>;
    };
}

export type UserPreferenceMutation =
    "profile" | "download" | "heatmap" | "language";
export type UserSessionPatch = Partial<
    Pick<SessionResponse, "image" | "autoAddToLibrary" | "showListeningHeatmap">
>;
