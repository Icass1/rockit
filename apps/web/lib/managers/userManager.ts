import type { SessionResponse, ThemePreference } from "@/dto";
import {
    BaseUserManager,
    EQueueType,
    ERepeatMode,
    EWebSocketMessage,
} from "@rockit/shared";
import type {
    UserPreferenceMutation,
    UserSessionPatch,
    UserSessionServices,
} from "@/models/interfaces/userSessionServices";
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
    private _scopeAtom = createAtom(0);
    private _mutationRevisions = {
        profile: 0,
        download: 0,
        heatmap: 0,
        theme: 0,
        language: 0,
    };
    private _sessionRequest = 0;
    private _initialization?: Promise<void>;
    private _cacheTask = Promise.resolve();
    private _bootstrapSession?: SessionResponse;

    constructor(private readonly dependencies?: UserSessionServices) {
        super();
    }

    private get services(): UserSessionServices {
        return (
            this.dependencies ?? {
                http: Http,
                notificationManager: rockIt.notificationManager,
                vocabularyManager: rockIt.vocabularyManager,
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
        this._scopeAtom.set(this._generation);
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
            this._scopeAtom.set(this._generation);
            this._accountGeneration++;
        }
        this.applySessionFields(session);
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
        this._scopeAtom.set(this._generation);
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

    get scopeAtom(): ReadonlyAtom<number> {
        return this._scopeAtom.getReadonlyAtom();
    }

    private isCurrentMutation(
        generation: number,
        kind: UserPreferenceMutation,
        revision: number
    ): boolean {
        return (
            this._active &&
            generation === this._generation &&
            !!this._session.get() &&
            revision === this._mutationRevisions[kind]
        );
    }

    private patchSession(patch: UserSessionPatch): Promise<void> {
        const current = this._session.get();
        if (!current) return Promise.resolve();
        const updated = { ...current, ...patch };
        // A read begun before this successful mutation cannot restore old preferences.
        this._sessionRequest++;
        if (patch.image !== undefined) this._image.set(patch.image);
        if (patch.showListeningHeatmap !== undefined)
            this._showListeningHeatmap.set(patch.showListeningHeatmap);
        this._session.set(updated);
        return this.cacheTask(() => this.services.sessionCache.save(updated));
    }

    async uploadProfileImageAsync(file: File): Promise<boolean> {
        if (
            !this._session.get() ||
            !["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
            file.size === 0 ||
            file.size > 5 * 1024 * 1024
        )
            return false;
        const generation = this._generation;
        const revision = ++this._mutationRevisions.profile;
        const isCurrent = (): boolean =>
            this.isCurrentMutation(generation, "profile", revision);
        if (!isCurrent()) return false;
        try {
            const upload = await this.services.http.uploadProfileImage(
                file,
                file.name
            );
            if (!isCurrent() || !upload.isOk()) return false;
            const session = await this.services.http.getSession();
            if (
                !isCurrent() ||
                !session.isOk() ||
                session.result.username !== this._session.get()?.username
            )
                return false;
            await this.patchSession({ image: session.result.image });
            return isCurrent();
        } catch (error) {
            if (isCurrent())
                console.error("Cannot upload profile image", error);
            return false;
        }
    }

    get showListeningHeatmapAtom(): ReadonlyAtom<boolean> {
        return this._showListeningHeatmap.getReadonlyAtom();
    }

    async setDownloadAutoAddToLibraryAsync(enabled: boolean): Promise<boolean> {
        return this.savePreference(
            "download",
            () =>
                this.services.http.updateDownloadSettings({
                    autoAddToLibrary: enabled,
                }),
            { autoAddToLibrary: enabled }
        );
    }

    async setListeningHeatmapAsync(enabled: boolean): Promise<boolean> {
        return this.savePreference(
            "heatmap",
            () => this.services.http.updateListeningHeatmap({ enabled }),
            { showListeningHeatmap: enabled }
        );
    }

    async setThemeAsync(theme: ThemePreference): Promise<boolean> {
        return this.savePreference(
            "theme",
            () => this.services.http.updateTheme({ theme }),
            { theme }
        );
    }

    private async savePreference(
        kind: "download" | "heatmap" | "theme",
        request: () => Promise<{ isOk(): boolean }>,
        patch: UserSessionPatch
    ): Promise<boolean> {
        const generation = this._generation;
        const revision = ++this._mutationRevisions[kind];
        const isCurrent = (): boolean =>
            this.isCurrentMutation(generation, kind, revision);
        if (!isCurrent()) return false;
        try {
            const result = await request();
            if (!isCurrent()) return false;
            if (!result.isOk()) throw new Error("Preference update rejected");
            await this.patchSession(patch);
            return isCurrent();
        } catch {
            if (isCurrent())
                this.services.notificationManager.notifyError(
                    this.services.vocabularyManager.vocabulary.ERROR
                );
            return false;
        }
    }

    async setLangAsync(langCode: string): Promise<boolean> {
        const generation = this._generation;
        const revision = ++this._mutationRevisions.language;
        const isCurrent = (): boolean =>
            this.isCurrentMutation(generation, "language", revision);
        if (!isCurrent()) return false;
        try {
            const result = await this.services.http.updateLang({
                lang: langCode,
            });
            if (!isCurrent()) return false;
            if (!result.isOk()) throw new Error("Language update rejected");
            const vocabulary =
                await this.services.vocabularyManager.getVocabularyAsync(
                    langCode
                );
            if (!isCurrent()) return false;
            if (!vocabulary.isOk())
                throw new Error("Vocabulary refresh rejected");
            this.services.vocabularyManager.setVocabulary(vocabulary.result);
            this.services.notificationManager.notifySuccess(
                this.services.vocabularyManager.vocabulary.LANGUAGE_CHANGED
            );
            window.dispatchEvent(new Event("rockit:language-changed"));
            return true;
        } catch {
            if (isCurrent())
                this.services.notificationManager.notifyError(
                    this.services.vocabularyManager.vocabulary
                        .ERROR_CHANGING_LANGUAGE
                );
            return false;
        }
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
