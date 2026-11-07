import type { UserManager } from "@/lib/managers/userManager";
import type { WebSocketManager } from "@/lib/managers/webSocketManger";

export interface NotificationServices {
    userManager: Pick<UserManager, "sessionAtom">;
    webSocketManager: Pick<WebSocketManager, "onMessage" | "offMessage">;
}
