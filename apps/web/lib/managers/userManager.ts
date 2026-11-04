import type { SessionResponse } from "@/dto";
import {
    BaseUserManager,
    EQueueType,
    ERepeatMode,
    EWebSocketMessage,
} from "@rockit/shared";
import type { UserSessionServices } from "@/models/interfaces/userSessionServices";
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
    private _active = false;
    private _generation = 0;
    private _accountGeneration = 0;
    private _sessionRequest = 0;
    private _initialization?: Promise<void>;
    private _cacheTask = Promise.resolve();
    private _bootstrapSession?: SessionResponse;
    private _session = createAtom<SessionResponse | null | undefined>();

    constructor(private readonly dependencies?: UserSessionServices) {
        super();
    }

    private get services(): UserSessionServices {
        return (
            this.dependencies ?? {
                http: Http,
                searchManager: rockIt.searchManager,
                downloaderManager: rockIt.downloaderManager,
                webSocketManager: rockIt.webSocketManager,
                queueManager: rockIt.queueManager,
                sessionCache: {
                    load: loadSessionOffline,
                    save: saveSessionOffline,
                    clear: clearSessionOffline,
                },
            }
        );
    }

    start(): Promise<void> {
        if (typeof window === "undefined") return Promise.resolve();
        if (!this._active) {
            this._active = true;
            this.services.webSocketManager.onMessage(
                EWebSocketMessage.QueueType,
                this._handleQueueType
            );
        }
        return this.init();
    }

    stop(): void {
        if (!this._active) return;
        this._active = false;
        this.services.webSocketManager.offMessage(
            EWebSocketMessage.QueueType,
            this._handleQueueType
        );
        this._generation++;
        this._sessionRequest++;
        this._initialization = undefined;
        this._init = false;
        this._bootstrapSession = this._session.get() ?? undefined;
    }

    override init(): Promise<void> {
        if (!this._initialization) {
            this._init = true;
            this._initialization = this.updateAsync();
        }
        return this._initialization;
    }

    protected override _handleQueueType = (data: {
        queueType: "SORTED" | "RANDOM";
    }): void => {
        if (!this._active || !this._session.get()) return;
        this._queueTypeAtom.set(
            data.queueType === "RANDOM" ? EQueueType.RANDOM : EQueueType.SORTED
        );
        this.services.queueManager.updateQueue();
    };

    private cacheTask(
        operation: () => Promise<void>,
        generation = this._accountGeneration
    ): Promise<void> {
        this._cacheTask = this._cacheTask
            .then(async () => {
                if (generation === this._accountGeneration) await operation();
            })
            .catch(() => {});
        return this._cacheTask;
    }

    get sessionAtom(): ReadonlyAtom<SessionResponse | null | undefined> {
        return this._session.getReadonlyAtom();
    }

    seedSession(session: SessionResponse): void {
        if (this._init || this._session.get() === session) return;
        this._sessionRequest++;
        this._bootstrapSession = session;
        this.applySession(session);
        this._sessionReady.set(true);
    }

    private applySession(session: SessionResponse): void {
        if (this._session.get()?.username !== session.username) {
            this._generation++;
            this._accountGeneration++;
        }
        this._queueTypeAtom.set(EQueueType[session.queueType]);
        this._repeatModeAtom.set(ERepeatMode[session.repeatMode]);
        this._image.set(session.image);
        this._admin.set(session.admin);
        this._username.set(session.username);
        this._currentTimeMs.set(session.currentTimeMs);
        this._loggedIn.set(true);
        this._showListeningHeatmap.set(session.showListeningHeatmap);
        this._session.set(session);
        this._sessionReady.set(true);
        void this.cacheTask(() => this.services.sessionCache.save(session));
    }

    private _showListeningHeatmap = createAtom(true);
    private _sessionReady = createAtom(false);
    get sessionReadyAtom(): ReadonlyAtom<boolean> {
        return this._sessionReady.getReadonlyAtom();
    }

    override async updateAsync(): Promise<void> {
        const generation = this._generation;
        const request = ++this._sessionRequest;
        const isCurrent = (): boolean =>
            generation === this._generation && request === this._sessionRequest;
        try {
            if (this._bootstrapSession) {
                this._bootstrapSession = undefined;
                return;
            }
            const response = await this.services.http.getSession();
            if (!isCurrent()) return;
            if (response.isOk()) {
                this.applySession(response.result);
                return;
            }
            if (
                response.code !== 401 &&
                (await this.restoreCachedSession(isCurrent))
            )
                return;
            if (!isCurrent()) return;
            this.clearSession();
            if (response.code === 401)
                await this.cacheTask(() => this.services.sessionCache.clear());
        } catch (error) {
            if (!isCurrent()) return;
            console.error("Cannot refresh session", error);
            if (await this.restoreCachedSession(isCurrent)) return;
            if (isCurrent()) this.clearSession();
        } finally {
            if (request === this._sessionRequest) this._sessionReady.set(true);
        }
    }

    private async restoreCachedSession(
        isCurrent: () => boolean
    ): Promise<boolean> {
        const cached = await this.services.sessionCache
            .load()
            .catch(() => undefined);
        if (!isCurrent()) return false;
        const username = this._session.get()?.username;
        if (!cached || (username && cached.username !== username)) return false;
        this.applySession(cached);
        return true;
    }

    private clearSession(): void {
        this._generation++;
        this._accountGeneration++;
        this._bootstrapSession = undefined;
        this._queueTypeAtom.set(EQueueType.SORTED);
        this._repeatModeAtom.set(ERepeatMode.OFF);
        this._image.set("");
        this._admin.set(false);
        this._username.set("");
        this._currentTimeMs.set(null);
        this._showListeningHeatmap.set(true);
        this._loggedIn.set(false);
        this._session.set(null);
        this._sessionReady.set(true);
        this.services.webSocketManager.disconnect();
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
        const generation = this._generation;
        try {
            const response = await this.services.http.logoutUser();
            if (generation !== this._generation) return;
            if (!response.isOk()) {
                console.error(
                    "Error logging out",
                    response.message,
                    response.detail
                );
                return;
            }
            this.clearSession();
            this.services.searchManager.clearResults();
            this.services.downloaderManager.reset();
            await this.cacheTask(() => this.services.sessionCache.clear());
        } catch (error) {
            if (generation === this._generation)
                console.error("Cannot log out", error);
        }
    }
}
