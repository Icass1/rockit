import { EQueueType, ERepeatMode } from "@rockit/shared";
import { Http } from "@/lib/http";
import { rockIt } from "@/lib/rockit/rockIt";
import { createAtom } from "@/lib/store";

export class UserManager {
    private _queueTypeAtom = createAtom<EQueueType>(EQueueType.SORTED);
    private _repeatModeAtom = createAtom<ERepeatMode>(ERepeatMode.OFF);
    private _loggedIn = createAtom<boolean>(false);
    private _username = createAtom<string>("");
    private _image = createAtom<string>("");
    private _admin = createAtom<boolean>(false);
    private _currentTimeMs = createAtom<number | null>(null);

    async init() {
        if (typeof window === "undefined") return;
        await this.updateAsync();
    }

    async updateAsync() {
        const res = await Http.getSession();

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

    toggleRandomQueue() {
        if (this._queueTypeAtom.get() === EQueueType.RANDOM)
            this._queueTypeAtom.set(EQueueType.SORTED);
        else if (this._queueTypeAtom.get() === EQueueType.SORTED)
            this._queueTypeAtom.set(EQueueType.RANDOM);

        rockIt.webSocketManager.sendQueueType({
            queueType: this.queueTypeAtom.get(),
        });

        rockIt.queueManager.updateQueue();
    }

    cycleRepeatMode() {
        const modes: ERepeatMode[] = Object.values(ERepeatMode).map(
            (a) => a[1]
        );
        const current = this._repeatModeAtom.get();
        const currentIndex = modes.indexOf(current);
        const next = modes[(currentIndex + 1) % modes.length];
        this._repeatModeAtom.set(next);
    }

    async setLangAsync(langCode: string) {
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

    get queueTypeAtom() {
        return this._queueTypeAtom.getReadonlyAtom();
    }

    get repeatModeAtom() {
        return this._repeatModeAtom.getReadonlyAtom();
    }

    get loggedInAtom() {
        return this._loggedIn.getReadonlyAtom();
    }

    get usernameAtom() {
        return this._username.getReadonlyAtom();
    }

    get imageAtom() {
        return this._image.getReadonlyAtom();
    }

    get admin() {
        return this._admin.getReadonlyAtom();
    }

    get currentTimeMsAtom() {
        return this._currentTimeMs.getReadonlyAtom();
    }

    async signOut() {
        const response = await Http.logoutUser();
        if (response.isOk()) {
            // this._userAtom.set(undefined);
            rockIt.searchManager.clearResults();
            rockIt.currentListManager.clearCurrentList();
        } else {
            console.error(
                "Error logging out",
                response.message,
                response.detail
            );
        }
    }
}
