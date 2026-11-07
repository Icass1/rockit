import type { NotificationManager } from "@/lib/managers/notificationManager";
import type { UserManager } from "@/lib/managers/userManager";
import type { VocabularyManager } from "@/lib/managers/vocabularyManager";
import type { WebSocketManager } from "@/lib/managers/webSocketManger";

export interface FriendServices {
    userManager: Pick<UserManager, "sessionAtom">;
    webSocketManager: Pick<WebSocketManager, "onMessage" | "offMessage">;
    notificationManager: Pick<
        NotificationManager,
        "notifyError" | "notifySuccess"
    >;
    vocabularyManager: Pick<VocabularyManager, "vocabulary">;
}
