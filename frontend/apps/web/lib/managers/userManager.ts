import { EQueueType, ERepeatMode } from "@rockit/shared";
import { Http } from "@/lib/http";
import { rockIt } from "@/lib/rockit/rockIt";
import { createAtom, ReadonlyAtom } from "@/lib/store";

export class UserManager {
    private _queueTypeAtom = createAtom<EQueueType>(EQueueType.SORTED);
    private _repeatModeAtom = createAtom<ERepeatMode>(ERepeatMode.OFF);
    private _loggedIn = createAtom<boolean>(false);
    private _username = createAtom<string>("");
    private _image = createAtom<string>("");
    private _admin = createAtom<boolean>(false);
    private _currentTimeMs = createAtom<number | null>(null);

    async init(): Promise<void> {
        if (typeof window === "undefined") return;
        await this.updateAsync();
    }

    async updateAsync(): Promise<void> {
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

    toggleRandomQueue(): void {
        if (this._queueTypeAtom.get() === EQueueType.RANDOM)
            this._queueTypeAtom.set(EQueueType.SORTED);
        else if (this._queueTypeAtom.get() === EQueueType.SORTED)
            this._queueTypeAtom.set(EQueueType.RANDOM);

        rockIt.webSocketManager.sendQueueType({
            queueType: this.queueTypeAtom.get(),
        });

        rockIt.queueManager.updateQueue();
    }

    cycleRepeatMode(): void {
        const modes = [ERepeatMode.OFF, ERepeatMode.ONE, ERepeatMode.ALL];
        const current = this._repeatModeAtom.get();
        const currentIndex = modes.indexOf(current);
        const next = modes[(currentIndex + 1) % modes.length];
        this._repeatModeAtom.set(next);
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

    get queueTypeAtom(): ReadonlyAtom<EQueueType> {
        return this._queueTypeAtom.getReadonlyAtom();
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

    async signOut(): Promise<void> {
        const response = await Http.logoutUser();
        if (response.isOk()) {
            rockIt.searchManager.clearResults();
        } else {
            console.error(
                "Error logging out",
                response.message,
                response.detail
            );
        }
    }
}
