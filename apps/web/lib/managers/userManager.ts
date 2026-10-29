import { BaseUserManager, EQueueType, ERepeatMode } from "@rockit/shared";
import { Http } from "@/lib/http";
import {
    clearSessionOffline,
    loadSessionOffline,
    saveSessionOffline,
} from "@/lib/offline/db";
import { rockIt } from "@/lib/rockit/rockIt";
import { createAtom, type ReadonlyAtom } from "@/lib/store";
import { isIOS } from "@/lib/utils/isIOS";

/**
 * Web user manager. Queue-type / repeat / profile state lives in the shared
 * BaseUserManager; language switching and sign-out are web-only concerns that
 * touch the web vocabulary and search managers.
 */
export class UserManager extends BaseUserManager {
    private _sessionReady = createAtom(false);
    private _volumeUser?: string;
    private _volumeTimer?: ReturnType<typeof setTimeout>;
    private _pendingVolume?: number;
    private _savingVolume = false;
    private _restoringVolume = false;

    override async init(): Promise<void> {
        if (this._init) return;
        await super.init();
        rockIt.mediaPlayerManager.volumeAtom.listen((volume) => {
            if (isIOS() || this._restoringVolume || !this._loggedIn.get())
                return;
            this._pendingVolume = volume;
            clearTimeout(this._volumeTimer);
            this._volumeTimer = setTimeout(
                () => void this.saveVolumeAsync(),
                300
            );
        });
    }

    private restoreVolume(username: string, volume: number): void {
        if (this._volumeUser === username) return;
        clearTimeout(this._volumeTimer);
        this._pendingVolume = undefined;
        this._volumeUser = username;
        this._restoringVolume = true;
        try {
            rockIt.mediaPlayerManager.volume =
                isIOS() || !Number.isFinite(volume) ? 1 : volume;
        } finally {
            this._restoringVolume = false;
        }
    }

    private async saveVolumeAsync(): Promise<void> {
        if (this._savingVolume || isIOS()) return;
        const username = this._volumeUser;
        this._savingVolume = true;
        try {
            while (
                this._pendingVolume !== undefined &&
                this._loggedIn.get() &&
                this._volumeUser === username
            ) {
                const volume = this._pendingVolume;
                this._pendingVolume = undefined;
                const result = await Http.updateVolume({ volume });
                if (!result.isOk())
                    console.error(
                        "Cannot save volume preference",
                        result.detail
                    );
            }
        } catch (error) {
            console.error("Cannot save volume preference", error);
        } finally {
            this._savingVolume = false;
            if (this._pendingVolume !== undefined && this._loggedIn.get()) {
                clearTimeout(this._volumeTimer);
                this._volumeTimer = setTimeout(
                    () => void this.saveVolumeAsync(),
                    300
                );
            }
        }
    }

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
                this.restoreVolume(res.result.username, res.result.volume);
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
                    this.restoreVolume(cached.username, cached.volume);
                } else {
                    this._loggedIn.set(false);
                    rockIt.notificationManager.setUser();
                    rockIt.webSocketManager.disconnect();
                }
            } else {
                this._loggedIn.set(false);
                rockIt.notificationManager.setUser();
                rockIt.webSocketManager.disconnect();
                clearSessionOffline().catch(() => {});
                console.error(res.detail);
            }
        } finally {
            this._sessionReady.set(true);
        }
    }

    async uploadProfileImageAsync(file: File): Promise<boolean> {
        const username = this._username.get();
        if (
            !this._loggedIn.get() ||
            !["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
            file.size === 0 ||
            file.size > 5 * 1024 * 1024
        )
            return false;
        try {
            if (!(await Http.uploadProfileImage(file))) return false;
            const session = await Http.getSession();
            if (
                !session.isOk() ||
                !this._loggedIn.get() ||
                this._username.get() !== username
            )
                return false;
            this._image.set(session.result.image);
            void saveSessionOffline(session.result).catch(() => {});
            return true;
        } catch (error) {
            console.error("Cannot upload profile image", error);
            return false;
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
            rockIt.notificationManager.notifyError(
                rockIt.vocabularyManager.vocabulary.ERROR_CHANGING_LANGUAGE
            );
            console.error("Error changing language", res.message, res.detail);
        }

        return res.isOk();
    }

    async signOut(): Promise<void> {
        const response = await Http.logoutUser();
        if (response.isOk()) {
            clearTimeout(this._volumeTimer);
            this._pendingVolume = undefined;
            this._volumeUser = undefined;
            rockIt.searchManager.clearResults();
            rockIt.downloaderManager.reset();
            await clearSessionOffline().catch(() => {});
            this._loggedIn.set(false);
            rockIt.notificationManager.setUser();
            rockIt.webSocketManager.disconnect();
        } else {
            console.error(
                "Error logging out",
                response.message,
                response.detail
            );
        }
    }
}
