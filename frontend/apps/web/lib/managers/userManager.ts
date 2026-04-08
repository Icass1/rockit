import {
    EQueueType,
    ERepeatMode,
    OkResponseSchema,
    SessionResponse,
    SessionResponseSchema,
    UpdateLangRequestSchema,
} from "@rockit/shared";
import { rockIt } from "@/lib/rockit/rockIt";
import { createAtom } from "@/lib/store";
import { apiFetch, apiPostFetch } from "@/lib/utils/apiFetch";

export class UserManager {
    private _queueTypeAtom = createAtom<EQueueType>(EQueueType.SORTED);
    private _repeatModeAtom = createAtom<ERepeatMode>(ERepeatMode.OFF);
    private _userAtom = createAtom<SessionResponse | undefined>();

    async init() {
        if (typeof window === "undefined") return;

        const res = await apiFetch("/user/session", SessionResponseSchema);

        if (res.isOk()) {
            this._userAtom.set(res.result);
        } else if (res.isNotOk()) {
            console.error(res.detail);
        } else {
            console.error("Unkown error", res.message);
        }
    }

    toggleRandomQueue() {
        const current = this._queueTypeAtom.get();

        if (!rockIt.queueManager.queue.length) return;

        if (current === EQueueType.RANDOM) {
            rockIt.queueManager.shuffleQueue();
        } else {
            rockIt.queueManager.restoreOriginalQueue();
        }
    }

    cycleRepeatMode() {
        const modes: ERepeatMode[] = Object.values(ERepeatMode).map(
            (a) => a[1]
        );
        console.log(modes);
        const current = this._repeatModeAtom.get();
        const currentIndex = modes.indexOf(current);
        const next = modes[(currentIndex + 1) % modes.length];
        this._repeatModeAtom.set(next);
    }

    async setLangAsync(langCode: string) {
        const res = await apiPostFetch(
            "/user/lang",
            UpdateLangRequestSchema,
            OkResponseSchema,
            {
                lang: langCode,
            }
        );

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

    get userAtom() {
        return this._userAtom.getReadonlyAtom();
    }

    get userAtomForDirectAccess() {
        return this._userAtom;
    }

    get user() {
        return this._userAtom.get();
    }

    async signOut() {
        const response = await apiFetch("/auth/logout", OkResponseSchema);
        if (response.isOk()) {
            this._userAtom.set(undefined);
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
