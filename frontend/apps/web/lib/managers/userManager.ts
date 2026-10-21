import { BaseUserManager, EQueueType, ERepeatMode } from "@rockit/shared";
import { Http } from "@/lib/http";
import {
    clearSessionOffline,
    loadSessionOffline,
    saveSessionOffline,
} from "@/lib/offline/db";
import { rockIt } from "@/lib/rockit/rockIt";
import { createAtom, type ReadonlyAtom } from "@/lib/store";

/**
 * Web user manager. Queue-type / repeat / profile state lives in the shared
 * BaseUserManager; language switching and sign-out are web-only concerns that
 * touch the web vocabulary and search managers.
 */
export class UserManager extends BaseUserManager {
    private _sessionReady = createAtom(false);

    get sessionReadyAtom(): ReadonlyAtom<boolean> {
        return this._sessionReady.getReadonlyAtom();
    }

    async updateAsync(): Promise<void> {
        try {
            const res = await rockIt.http.getSession();

            if (res.isOk()) {
                this._queueTypeAtom.set(EQueueType[res.result.queueType]);
                this._repeatModeAtom.set(ERepeatMode[res.result.repeatMode]);
                this._image.set(res.result.image);
                this._admin.set(res.result.admin);
                this._username.set(res.result.username);
                this._currentTimeMs.set(res.result.currentTimeMs);
                rockIt.notificationManager.setUser(res.result.username);
                this._loggedIn.set(true);
                saveSessionOffline(res.result).catch(() => {});
            } else if (res.code !== 401) {
                const cached = await loadSessionOffline();
                if (cached) {
                    this._queueTypeAtom.set(EQueueType[cached.queueType]);
                    this._repeatModeAtom.set(ERepeatMode[cached.repeatMode]);
                    this._image.set(cached.image);
                    this._admin.set(cached.admin);
                    this._username.set(cached.username);
                    this._currentTimeMs.set(cached.currentTimeMs);
                    rockIt.notificationManager.setUser(cached.username);
                    this._loggedIn.set(true);
                } else {
                    this._loggedIn.set(false);
                    rockIt.notificationManager.setUser();
                }
            } else {
                this._loggedIn.set(false);
                rockIt.notificationManager.setUser();
                clearSessionOffline().catch(() => {});
                console.error(res.detail);
            }
        } finally {
            this._sessionReady.set(true);
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
            rockIt.downloaderManager.reset();
            await clearSessionOffline().catch(() => {});
            this._loggedIn.set(false);
            rockIt.notificationManager.setUser();
        } else {
            console.error(
                "Error logging out",
                response.message,
                response.detail
            );
        }
    }
}
