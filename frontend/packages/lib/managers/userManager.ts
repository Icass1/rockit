import { SessionResponse } from "@/dto";
import { EQueueType } from "@/models/enums/queueType";
import { ERepeatMode } from "@/models/enums/repeatMode";
import { getUserInClient } from "@/lib/getUserInClient";
import { rockIt } from "@/lib/rockit/rockIt";
import { createAtom } from "@/lib/store";

export class UserManager {
    // #region: Atoms

    private _queueTypeAtom = createAtom<EQueueType>(EQueueType.SORTED);
    private _repeatModeAtom = createAtom<ERepeatMode>(ERepeatMode.OFF);

    private _userAtom = createAtom<SessionResponse | undefined>();

    // #endregion

    // #region: Constructor

    public async init() {
        if (typeof window === "undefined") return;
        const session = await getUserInClient();
        if (!session) {
            console.warn("No session found in UserManager");
        }

        this._userAtom.set(session);
    }

    // #endregion

    // #region: Methods
    toggleRandomQueue() {
        const modes = Object.values(EQueueType).filter(
            (v) => typeof v === "number"
        ) as EQueueType[];
        const current = this._queueTypeAtom.get();
        const next = modes[(modes.indexOf(current) + 1) % modes.length];
        this._queueTypeAtom.set(next);

        if (!rockIt.queueManager.queue.length) return;

        if (this._queueTypeAtom.get() == EQueueType.RANDOM) {
            rockIt.queueManager.shuffleQueue();
        } else if (this._queueTypeAtom.get() == EQueueType.SORTED) {
            rockIt.queueManager.restoreOriginalQueue();
        }
    }

    cyclerepeatSong() {
        const modes = Object.values(ERepeatMode).filter(
            (v) => typeof v === "number"
        ) as ERepeatMode[];
        const current = this._repeatModeAtom.get();
        const next = modes[(modes.indexOf(current) + 1) % modes.length];
        this._repeatModeAtom.set(next);
    }

    async setLangAsync(lang: string) {
        console.log(lang);
        throw "(setLangAsync) Method not implemented.";
    }

    async setCrossFadeAsync(crossFade: number) {
        console.log(crossFade);
        throw "(setCrossFadeAsync) Method not implemented.";
    }

    signOut() {}

    // #endregion

    // #region: Getters

    get queueTypeAtom() {
        return this._queueTypeAtom;
    }

    get repeatModeAtom() {
        return this._repeatModeAtom;
    }

    get userAtom() {
        return this._userAtom;
    }

    get user() {
        return this._userAtom.get();
    }

    // #endregion
}
