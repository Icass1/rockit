import type { SessionResponse } from "@/dto";
import type { Http } from "@/lib/api/browser";
import type { DownloaderManager } from "@/lib/managers/downloaderManager";
import type { QueueManager } from "@/lib/managers/queueManager";
import type { SearchManager } from "@/lib/managers/searchManager";
import type { WebSocketManager } from "@/lib/managers/webSocketManger";

export interface UserSessionServices {
    http: Pick<typeof Http, "getSession" | "logoutUser">;
    webSocketManager: Pick<
        WebSocketManager,
        "onMessage" | "offMessage" | "disconnect"
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
