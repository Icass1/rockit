import { BaseUserManager } from "@rockit/shared";
import { Http } from "@/lib/http";
import { rockIt } from "@/lib/rockit/rockIt";

/**
 * Web user manager. Queue-type / repeat / profile state lives in the shared
 * BaseUserManager; language switching and sign-out are web-only concerns that
 * touch the web vocabulary and search managers.
 */
export class UserManager extends BaseUserManager {
    async setLangAsync(langCode: string): Promise<boolean> {
        const res = await Http.updateLang({ lang: langCode });

        if (res.isOk()) {
            rockIt.notificationManager.notifySuccess(
                rockIt.vocabularyManager.vocabulary.LANGUAGE_CHANGED
            );
            await rockIt.vocabularyManager.init();
        } else {
            rockIt.notificationManager.notifySuccess(
                rockIt.vocabularyManager.vocabulary.ERROR_CHANGING_LANGUAGE
            );
            console.error("Error changing language", res.message, res.detail);
        }

        return true;
    }

    async signOut(): Promise<void> {
        const response = await Http.logoutUser();
        if (response.isOk()) {
            rockIt.searchManager.clearResults();
        } else {
            console.error(
                "Error logging out",
                response.message,
                response.detail
            );
        }
    }
}
