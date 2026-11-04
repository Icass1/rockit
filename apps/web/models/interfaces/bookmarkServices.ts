import type { MediaPlayerManager } from "@/lib/managers/mediaPlayerManager";
import type { NotificationManager } from "@/lib/managers/notificationManager";
import type { QueueManager } from "@/lib/managers/queueManager";
import type { UserManager } from "@/lib/managers/userManager";

/** Existing state owners used by the shell's bookmark integration. */
export interface BookmarkServices {
    userManager: Pick<UserManager, "sessionAtom">;
    queueManager: Pick<QueueManager, "currentMedia" | "currentMediaAtom">;
    mediaPlayerManager: Pick<
        MediaPlayerManager,
        "currentTimeAtom" | "setCurrentTime"
    >;
    notificationManager: Pick<
        NotificationManager,
        "notifySuccess" | "notifyError"
    >;
}
