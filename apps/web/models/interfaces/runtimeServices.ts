import type { BookmarkManager } from "@/lib/managers/bookmarkManager";
import type { UserManager } from "@/lib/managers/userManager";
import type { WebSocketManager } from "@/lib/managers/webSocketManger";

/** Stable runtime references used by the mounted application shell. */
export interface RuntimeServices {
    init(): Promise<void>;
    userManager: Pick<UserManager, "sessionAtom" | "seedSession">;
    webSocketManager: Pick<WebSocketManager, "start" | "stop">;
    bookmarkManager: Pick<BookmarkManager, "start" | "stop">;
}
