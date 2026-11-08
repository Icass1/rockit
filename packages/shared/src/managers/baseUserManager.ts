import { type QueueTypeMessage, type SessionResponse } from "@/dto";
import { getRockIt } from "@/rockit/rockitRef";
import { EQueueType } from "@/models/enums/queueType";
import { ERepeatMode } from "@/models/enums/repeatMode";
import { EWebSocketMessage } from "@/models/types/webSocketMessages";
import { createAtom, type ReadonlyAtom } from "@/lib/store";

/**
 * Shared user/settings state (queue type, repeat mode, saved playback position,
 * profile) driven by the session endpoint + WebSocket. Web-only concerns such
 * as language switching and sign-out live in the platform subclass.
 */
export class BaseUserManager {
    protected _init = false;
    protected _session = createAtom<SessionResponse | null | undefined>();
    private _sessionRevision = 0;

    protected _queueTypeAtom = createAtom<EQueueType>(EQueueType.SORTED);
    protected _repeatModeAtom = createAtom<ERepeatMode>(ERepeatMode.OFF);
    protected _loggedIn = createAtom<boolean>(false);
    protected _username = createAtom<string>("");
    protected _image = createAtom<string>("");
    protected _admin = createAtom<boolean>(false);
    protected _currentTimeMs = createAtom<number | null>(null);

    async init(): Promise<void> {
        if (this._init) return;
        this._init = true;

        if (!this._session.get()) await this.updateAsync();

        getRockIt().webSocketManager.onMessage(
            EWebSocketMessage.QueueType,
            this._handleQueueType
        );
    }

    protected _handleQueueType = (data: QueueTypeMessage): void => {
        const newType =
            data.queueType === "RANDOM" ? EQueueType.RANDOM : EQueueType.SORTED;
        this._queueTypeAtom.set(newType);
        getRockIt().queueManager.updateQueue();
    };

    seedSession(session: SessionResponse): void {
        this._sessionRevision++;
        this.applySessionFields(session);
        this._session.set(session);
    }

    protected applySessionFields(session: SessionResponse): void {
        this._queueTypeAtom.set(EQueueType[session.queueType]);
        this._repeatModeAtom.set(ERepeatMode[session.repeatMode]);
        this._image.set(session.image);
        this._admin.set(session.admin);
        this._username.set(session.username);
        this._currentTimeMs.set(session.currentTimeMs);
        this._loggedIn.set(true);
    }

    get sessionAtom(): ReadonlyAtom<SessionResponse | null | undefined> {
        return this._session.getReadonlyAtom();
    }

    stop(): void {
        this._sessionRevision++;
        this._init = false;
        getRockIt().webSocketManager.offMessage(
            EWebSocketMessage.QueueType,
            this._handleQueueType
        );
        this._session.set(null);
        this._loggedIn.set(false);
        this._username.set("");
        this._image.set("");
        this._admin.set(false);
        this._currentTimeMs.set(null);
    }

    async updateAsync(): Promise<void> {
        const revision = ++this._sessionRevision;
        const response = await getRockIt().http.getSession();
        if (revision !== this._sessionRevision) return;
        if (response.isOk()) this.seedSession(response.result);
        else {
            this._session.set(null);
            this._loggedIn.set(false);
        }
    }

    toggleRandomQueue(): void {
        const togglingToRandom =
            this._queueTypeAtom.get() === EQueueType.SORTED;

        if (this._queueTypeAtom.get() === EQueueType.RANDOM)
            this._queueTypeAtom.set(EQueueType.SORTED);
        else if (this._queueTypeAtom.get() === EQueueType.SORTED)
            this._queueTypeAtom.set(EQueueType.RANDOM);

        getRockIt().webSocketManager.sendQueueType({
            queueType: this.queueTypeAtom.get(),
        });

        getRockIt().queueManager.updateQueue(togglingToRandom);
    }

    cycleRepeatMode(): void {
        const modes = [ERepeatMode.OFF, ERepeatMode.ONE, ERepeatMode.ALL];
        const current = this._repeatModeAtom.get();
        const currentIndex = modes.indexOf(current);
        const next = modes[(currentIndex + 1) % modes.length];
        this._repeatModeAtom.set(next);

        // Persist to the backend. The endpoint cycles server-side in the same
        // OFF -> ONE -> ALL order, so it stays consistent with the local atom.
        void getRockIt().http.cycleRepeatMode();
    }

    get queueTypeAtom(): ReadonlyAtom<EQueueType> {
        return this._queueTypeAtom.getReadonlyAtom();
    }

    get queueType(): EQueueType {
        return this._queueTypeAtom.get();
    }

    get repeatModeAtom(): ReadonlyAtom<ERepeatMode> {
        return this._repeatModeAtom.getReadonlyAtom();
    }

    get loggedInAtom(): ReadonlyAtom<boolean> {
        return this._loggedIn.getReadonlyAtom();
    }

    get usernameAtom(): ReadonlyAtom<string> {
        return this._username.getReadonlyAtom();
    }

    get imageAtom(): ReadonlyAtom<string> {
        return this._image.getReadonlyAtom();
    }

    get admin(): ReadonlyAtom<boolean> {
        return this._admin.getReadonlyAtom();
    }

    get currentTimeMsAtom(): ReadonlyAtom<number | null> {
        return this._currentTimeMs.getReadonlyAtom();
    }
}
