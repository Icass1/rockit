import type { NotificationManager } from "@/lib/managers/notificationManager";
import type { UserManager } from "@/lib/managers/userManager";
import type { VocabularyManager } from "@/lib/managers/vocabularyManager";

export interface NavigationPinsServices {
    userManager: Pick<UserManager, "sessionAtom">;
    notificationManager: Pick<
        NotificationManager,
        "notifyError" | "notifySuccess"
    >;
    vocabularyManager: Pick<VocabularyManager, "vocabulary">;
}
