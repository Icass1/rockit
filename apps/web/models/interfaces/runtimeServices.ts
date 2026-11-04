import type { BookmarkManager } from "@/lib/managers/bookmarkManager";
import type { FriendManager } from "@/lib/managers/friendManager";
import type { NavigationPinsManager } from "@/lib/managers/navigationPinsManager";
import type { NotificationManager } from "@/lib/managers/notificationManager";
import type { SharingManager } from "@/lib/managers/sharingManager";
import type { UserManager } from "@/lib/managers/userManager";
import type { WebSocketManager } from "@/lib/managers/webSocketManger";

/** Stable runtime references used by the mounted application shell. */
export interface RuntimeServices {
    init(): Promise<void>;
    friendManager: FriendManager;
    sharingManager: SharingManager;
    userManager: Pick<UserManager, "sessionAtom" | "seedSession">;
    webSocketManager: Pick<WebSocketManager, "start" | "stop">;
    notificationManager: Pick<
        NotificationManager,
        | "start"
        | "stop"
        | "notificationsAtom"
        | "unreadCountAtom"
        | "totalCountAtom"
        | "errorAtom"
        | "offset"
        | "setPage"
        | "markRead"
        | "destinationAsync"
    >;
    bookmarkManager: Pick<BookmarkManager, "start" | "stop">;
    navigationPinsManager: Pick<
        NavigationPinsManager,
        | "start"
        | "stop"
        | "pinsAtom"
        | "pendingAtom"
        | "statusAtom"
        | "refreshAsync"
        | "setPinnedAsync"
    >;
}
