import { SessionResponse } from "@/dto";
import { getUserInClient } from "@/lib/getUserInClient";
import { rockIt } from "@/lib/rockit/rockIt";
import { createAtom } from "@/lib/store";

export class UserManager {
    // #region: Atoms

    private _randomQueueAtom = createAtom<boolean>(false);
    private _repeatSongAtom = createAtom<"all" | "one" | "off">("off");

    private _userAtom = createAtom<SessionResponse | undefined>();

    // #endregion

    // #region: Constructor

    constructor() {
        if (typeof window === "undefined") return;
        this.init();
    }

    private async init() {
        const session = await getUserInClient();
        if (!session) {
            console.warn("No session found in UserManager");
        }

        this._userAtom.set(session);
    }

    // #endregion

    // #region: Methods
    toggleRandomQueue() {
        const newState = !this._randomQueueAtom.get();
        this._randomQueueAtom.set(newState);

        if (!rockIt.queueManager.queue.length) return;

        if (newState) {
            rockIt.queueManager.shuffleQueue();
        } else {
            rockIt.queueManager.restoreOriginalQueue();
        }
    }

    cyclerepeatSong() {
        this._repeatSongAtom.set(
            this._repeatSongAtom.get() === "off"
                ? "all"
                : this._repeatSongAtom.get() === "all"
                  ? "one"
                  : "off"
        );
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

    get randomQueueAtom() {
        return this._randomQueueAtom;
    }
    get repeatSongAtom() {
        return this._repeatSongAtom;
    }

    get userAtom() {
        return this._userAtom;
    }

    // #endregion
}
