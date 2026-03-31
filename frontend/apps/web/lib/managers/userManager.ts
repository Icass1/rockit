import {
    EQueueType,
    ERepeatMode,
    SessionResponse,
    SessionResponseSchema,
    UpdateLangRequestSchema,
} from "@rockit/shared";
import { rockIt } from "@/lib/rockit/rockIt";
import { createAtom } from "@/lib/store";
import { apiPostFetch, baseApiFetch } from "@/lib/utils/apiFetch";

export type QueueType = "SORTED" | "RANDOM";
export type RepeatMode = "OFF" | "ONE" | "ALL";

export class UserManager {
    private _queueTypeAtom = createAtom<QueueType>("SORTED");
    private _repeatModeAtom = createAtom<RepeatMode>("OFF");
    private _userAtom = createAtom<SessionResponse | undefined>();

    async init() {
        if (typeof window === "undefined") return;

        try {
            const res = await baseApiFetch("/session");
            if (res?.ok) {
                const json = await res.json();
                const session = SessionResponseSchema.parse(json);
                this._userAtom.set(session);
            }
        } catch {
            console.warn("No session found in UserManager");
        }
    }

    toggleRandomQueue() {
        const current = this._queueTypeAtom.get();
        const next: QueueType = current === "SORTED" ? "RANDOM" : "SORTED";
        this._queueTypeAtom.set(next);

        if (!rockIt.queueManager.queue.length) return;

        if (next === "RANDOM") {
            rockIt.queueManager.shuffleQueue();
        } else {
            rockIt.queueManager.restoreOriginalQueue();
        }
    }

    cycleRepeatMode() {
        const modes: RepeatMode[] = ["OFF", "ONE", "ALL"];
        const current = this._repeatModeAtom.get();
        const currentIndex = modes.indexOf(current);
        const next = modes[(currentIndex + 1) % modes.length];
        this._repeatModeAtom.set(next);
    }

    async setLangAsync(langCode: string) {
        try {
            const res = await apiPostFetch<{ lang: string }>("/user/lang", {
                lang: langCode,
            });

            if (!res.ok) {
                rockIt.notificationManager.notifyError(
                    "Failed to change language"
                );
                return false;
            }

            const sessionRes = await baseApiFetch("/session");
            if (sessionRes?.ok) {
                const json = await sessionRes.json();
                const session = SessionResponseSchema.parse(json);
                this._userAtom.set(session);
            }

            await rockIt.vocabularyManager.init();

            return true;
        } catch (e) {
            console.warn("Error setting language:", e);
            rockIt.notificationManager.notifyError("Failed to change language");
            return false;
        }
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
        try {
            await baseApiFetch("/auth/logout", { method: "POST" });
        } catch {
            // Ignore logout errors
        }
        this._userAtom.set(undefined);
        rockIt.searchManager.clearResults();
        rockIt.currentListManager.clearCurrentList();
    }
}
