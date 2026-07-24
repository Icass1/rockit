import { BaseUserManager, EQueueType, ERepeatMode } from "@rockit/shared";
import { Http } from "@/lib/http";
import { rockIt } from "@/lib/rockit/rockIt";
import {
    saveSessionOffline,
    loadSessionOffline,
} from "@/lib/offline/db";

/**
 * Web user manager. Queue-type / repeat / profile state lives in the shared
 * BaseUserManager; language switching and sign-out are web-only concerns that
 * touch the web vocabulary and search managers.
 */
export class UserManager extends BaseUserManager {
    async updateAsync(): Promise<void> {
        const res = await rockIt.http.getSession();

        if (res.isOk()) {
            this._queueTypeAtom.set(EQueueType[res.result.queueType]);
            this._repeatModeAtom.set(ERepeatMode[res.result.repeatMode]);
            this._image.set(res.result.image);
            this._admin.set(res.result.admin);
            this._username.set(res.result.username);
            this._currentTimeMs.set(res.result.currentTimeMs);
            this._loggedIn.set(true);

            saveSessionOffline(res.result).catch(() => {});
        } else if (res.code === 0) {
            const cached = await loadSessionOffline();
            if (cached) {
                this._queueTypeAtom.set(EQueueType[cached.queueType]);
                this._repeatModeAtom.set(ERepeatMode[cached.repeatMode]);
                this._image.set(cached.image);
                this._admin.set(cached.admin);
                this._username.set(cached.username);
                this._currentTimeMs.set(cached.currentTimeMs);
                this._loggedIn.set(true);
            } else {
                this._loggedIn.set(false);
            }
        } else {
            this._loggedIn.set(false);
            console.error(res.detail);
        }
    }

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
