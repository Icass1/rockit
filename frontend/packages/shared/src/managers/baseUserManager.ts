import { type QueueTypeMessage } from "../dto";
import { createAtom, type ReadonlyAtom } from "../lib/store";
import { EQueueType } from "../models/enums/queueType";
import { ERepeatMode } from "../models/enums/repeatMode";
import { EWebSocketMessage } from "../models/types/webSocketMessages";
import { getRockIt } from "../rockit/rockitRef";

/**
 * Shared user/settings state (queue type, repeat mode, saved playback position,
 * profile) driven by the session endpoint + WebSocket. Web-only concerns such
 * as language switching and sign-out live in the platform subclass.
 */
export class BaseUserManager {
    protected _init = false;

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

        await this.updateAsync();

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

    async updateAsync(): Promise<void> {
        const res = await getRockIt().http.getSession();

        if (res.isOk()) {
            this._queueTypeAtom.set(EQueueType[res.result.queueType]);
            this._repeatModeAtom.set(ERepeatMode[res.result.repeatMode]);
            this._image.set(res.result.image);
            this._admin.set(res.result.admin);
            this._username.set(res.result.username);
            this._currentTimeMs.set(res.result.currentTimeMs);

            this._loggedIn.set(true);
        } else if (res.isNotOk()) {
            this._loggedIn.set(false);
            console.error(res.detail);
        } else {
            this._loggedIn.set(false);
            console.error("Unkown error", res.message);
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
