import type { SessionResponse } from "@/dto";
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
    private _bootstrapSession?: SessionResponse;
    private _session = createAtom<SessionResponse | null | undefined>();

    get sessionAtom(): ReadonlyAtom<SessionResponse | null | undefined> {
        return this._session.getReadonlyAtom();
    }

    seedSession(session: SessionResponse): void {
        if (this._init) return;
        this._bootstrapSession = session;
        this.applySession(session);
        this._sessionReady.set(true);
    }

    private applySession(session: SessionResponse): void {
        this._queueTypeAtom.set(EQueueType[session.queueType]);
        this._repeatModeAtom.set(ERepeatMode[session.repeatMode]);
        this._image.set(session.image);
        this._admin.set(session.admin);
        this._username.set(session.username);
        this._currentTimeMs.set(session.currentTimeMs);
        rockIt.notificationManager.setUser(session.username);
        this._loggedIn.set(true);
        this._showListeningHeatmap.set(session.showListeningHeatmap);
        this.restoreVolume(session.username, session.volume);
        this._session.set(session);
        saveSessionOffline(session).catch(() => {});
    }

    private _showListeningHeatmap = createAtom(true);
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
            if (this._bootstrapSession) {
                const session = this._bootstrapSession;
                this._bootstrapSession = undefined;
                this.applySession(session);
                return;
            }
            const response = await Http.getSession();
            if (response.isOk()) {
                this.applySession(response.result);
                return;
            }
            if (response.code !== 401) {
                const cached = await loadSessionOffline();
                if (cached) {
                    this.applySession(cached);
                    return;
                }
            }
            this._session.set(null);
            this._loggedIn.set(false);
            rockIt.notificationManager.setUser();
            rockIt.webSocketManager.disconnect();
            if (response.code === 401)
                await clearSessionOffline().catch(() => {});
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
            const upload = await Http.uploadProfileImage(file, file.name);
            if (upload.isNotOk()) return false;
            const session = await Http.getSession();
            if (
                !session.isOk() ||
                !this._loggedIn.get() ||
                this._username.get() !== username
            )
                return false;
            this._image.set(session.result.image);
            this._session.set(session.result);
            void saveSessionOffline(session.result).catch(() => {});
            return true;
        } catch (error) {
            console.error("Cannot upload profile image", error);
            return false;
        }
    }

    get showListeningHeatmapAtom(): ReadonlyAtom<boolean> {
        return this._showListeningHeatmap.getReadonlyAtom();
    }

    async setDownloadAutoAddToLibraryAsync(enabled: boolean): Promise<boolean> {
        const session = this._session.get();
        if (!session) return false;
        try {
            const result = await Http.updateDownloadSettings({
                autoAddToLibrary: enabled,
            });
            const current = this._session.get();
            if (!current || current.username !== session.username) return false;
            if (!result.isOk()) throw new Error(result.message);
            const updated = { ...current, autoAddToLibrary: enabled };
            this._session.set(updated);
            await saveSessionOffline(updated).catch(() => {});
            return true;
        } catch (error) {
            rockIt.notificationManager.notifyError(
                error instanceof Error
                    ? error.message
                    : rockIt.vocabularyManager.vocabulary.ERROR
            );
            return false;
        }
    }

    async setListeningHeatmapAsync(enabled: boolean): Promise<boolean> {
        try {
            const result = await Http.updateListeningHeatmap({ enabled });
            if (!result.isOk()) {
                rockIt.notificationManager.notifyError(
                    "Could not save listening history preference"
                );
                return false;
            }
            this._showListeningHeatmap.set(enabled);
            const cached = await loadSessionOffline().catch(() => undefined);
            if (cached && cached.username === this._username.get()) {
                await saveSessionOffline({
                    ...cached,
                    showListeningHeatmap: enabled,
                }).catch(() => {});
            }
            return true;
        } catch (error) {
            console.error("Cannot save listening history preference", error);
            rockIt.notificationManager.notifyError(
                "Could not save listening history preference"
            );
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
            window.dispatchEvent(new Event("rockit:language-changed"));
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
            this._session.set(null);
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
