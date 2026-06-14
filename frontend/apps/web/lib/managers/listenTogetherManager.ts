import { Http } from "@/lib/http";
import { rockIt } from "@/lib/rockit/rockIt";
import { createArrayAtom, createAtom, ReadonlyAtom } from "@/lib/store";
import type { ListenSession } from "@/models/interfaces";

export class ListenTogetherManager {
    private _sessionsAtom = createArrayAtom<ListenSession>([]);
    private _activeSessionAtom = createAtom<ListenSession | null>(null);
    private _loadingAtom = createAtom<boolean>(false);

    async fetchSessions(): Promise<void> {
        try {
            const res = await Http.getActiveSessions();
            if (res.isOk()) {
                this._sessionsAtom.set(res.result.sessions ?? []);
                const active = (res.result.sessions ?? []).find(
                    (s: ListenSession) => s.status === "active"
                );
                this._activeSessionAtom.set(active ?? null);
            }
        } catch {
            // silent
        }
    }

    async invite(userPublicId: string): Promise<boolean> {
        try {
            const res = await Http.inviteToSession({ userPublicId });
            if (!res.isOk()) throw new Error(String(res.detail));
            rockIt.notificationManager.notifySuccess("Invitation sent!");
            await this.fetchSessions();
            return true;
        } catch {
            rockIt.notificationManager.notifyError("Failed to send invitation");
            return false;
        }
    }

    async join(sessionPublicId: string): Promise<boolean> {
        try {
            const res = await Http.joinSession({ sessionPublicId });
            if (!res.isOk()) throw new Error(String(res.detail));
            await this.fetchSessions();
            return true;
        } catch {
            return false;
        }
    }

    async leave(sessionPublicId: string): Promise<boolean> {
        try {
            const res = await Http.leaveSession({ sessionPublicId });
            if (!res.isOk()) throw new Error(String(res.detail));
            this._activeSessionAtom.set(null);
            await this.fetchSessions();
            return true;
        } catch {
            return false;
        }
    }

    async sync(data: {
        sessionPublicId: string;
        mediaPublicId?: string;
        currentTimeMs?: number;
        isPlaying?: boolean;
        queueJson?: string;
    }): Promise<void> {
        try {
            await Http.syncSession({
                sessionPublicId: data.sessionPublicId,
                mediaPublicId: data.mediaPublicId ?? null,
                currentTimeMs: data.currentTimeMs ?? null,
                isPlaying: data.isPlaying ?? null,
                queueJson: data.queueJson ?? null,
            });
        } catch {
            // silent
        }
    }

    get sessionsAtom(): ReadonlyAtom<ListenSession[]> {
        return this._sessionsAtom.getReadonlyAtom();
    }

    get activeSessionAtom(): ReadonlyAtom<ListenSession | null> {
        return this._activeSessionAtom.getReadonlyAtom();
    }

    get loadingAtom(): ReadonlyAtom<boolean> {
        return this._loadingAtom.getReadonlyAtom();
    }
}
