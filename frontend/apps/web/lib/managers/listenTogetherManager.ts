import { BACKEND_URL } from "@/environment";
import { rockIt } from "@/lib/rockit/rockIt";
import { createArrayAtom, createAtom, ReadonlyAtom } from "@/lib/store";

interface ListenSession {
    publicId: string;
    hostPublicId: string;
    hostUsername: string;
    hostImageUrl: string | null;
    guestPublicId: string;
    guestUsername: string;
    guestImageUrl: string | null;
    currentMediaPublicId: string | null;
    currentMediaName: string | null;
    currentMediaImageUrl: string | null;
    currentTimeMs: number;
    isPlaying: boolean;
    status: string;
}

export class ListenTogetherManager {
    private _sessionsAtom = createArrayAtom<ListenSession>([]);
    private _activeSessionAtom = createAtom<ListenSession | null>(null);
    private _loadingAtom = createAtom<boolean>(false);

    async fetchSessions(): Promise<void> {
        try {
            const res = await fetch(
                `${BACKEND_URL}/friends/listen-together/sessions`,
                { credentials: "include" }
            );
            if (!res.ok) throw new Error(await res.text());
            const data = await res.json();
            this._sessionsAtom.set(data.sessions ?? []);
            const active = (data.sessions ?? []).find(
                (s: ListenSession) => s.status === "active"
            );
            this._activeSessionAtom.set(active ?? null);
        } catch {
            // silent
        }
    }

    async invite(userPublicId: string): Promise<boolean> {
        try {
            const res = await fetch(
                `${BACKEND_URL}/friends/listen-together/invite`,
                {
                    method: "POST",
                    credentials: "include",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ userPublicId }),
                }
            );
            if (!res.ok) throw new Error(await res.text());
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
            const res = await fetch(
                `${BACKEND_URL}/friends/listen-together/join`,
                {
                    method: "POST",
                    credentials: "include",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ sessionPublicId }),
                }
            );
            if (!res.ok) throw new Error(await res.text());
            await this.fetchSessions();
            return true;
        } catch {
            return false;
        }
    }

    async leave(sessionPublicId: string): Promise<boolean> {
        try {
            const res = await fetch(
                `${BACKEND_URL}/friends/listen-together/leave`,
                {
                    method: "POST",
                    credentials: "include",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ sessionPublicId }),
                }
            );
            if (!res.ok) throw new Error(await res.text());
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
            await fetch(
                `${BACKEND_URL}/friends/listen-together/sync`,
                {
                    method: "POST",
                    credentials: "include",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(data),
                }
            );
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
