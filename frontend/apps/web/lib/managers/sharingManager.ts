import { BACKEND_URL } from "@/environment";
import { rockIt } from "@/lib/rockit/rockIt";
import { createArrayAtom, createAtom, ReadonlyAtom } from "@/lib/store";

interface SharedMediaItem {
    publicId: string;
    senderPublicId: string;
    senderUsername: string;
    senderImageUrl: string | null;
    mediaPublicId: string;
    mediaName: string;
    mediaImageUrl: string | null;
    mediaType: string;
    artistName: string | null;
    message: string | null;
    seen: boolean;
    dateAdded: string;
}

export class SharingManager {
    private _inboxAtom = createArrayAtom<SharedMediaItem>([]);
    private _sentAtom = createArrayAtom<SharedMediaItem>([]);
    private _loadingAtom = createAtom<boolean>(false);

    async fetchInbox(): Promise<void> {
        this._loadingAtom.set(true);
        try {
            const res = await fetch(
                `${BACKEND_URL}/friends/share/inbox`,
                { credentials: "include" }
            );
            if (!res.ok) throw new Error(await res.text());
            const data = await res.json();
            this._inboxAtom.set(data.items ?? []);
        } catch {
            // silent
        } finally {
            this._loadingAtom.set(false);
        }
    }

    async fetchSent(): Promise<void> {
        try {
            const res = await fetch(
                `${BACKEND_URL}/friends/share/sent`,
                { credentials: "include" }
            );
            if (!res.ok) throw new Error(await res.text());
            const data = await res.json();
            this._sentAtom.set(data.items ?? []);
        } catch {
            // silent
        }
    }

    async shareMedia(
        recipientPublicId: string,
        mediaPublicId: string,
        message?: string
    ): Promise<boolean> {
        try {
            const res = await fetch(
                `${BACKEND_URL}/friends/share`,
                {
                    method: "POST",
                    credentials: "include",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        recipientPublicId,
                        mediaPublicId,
                        message: message ?? null,
                    }),
                }
            );
            if (!res.ok) throw new Error(await res.text());
            await this.fetchSent();
            rockIt.notificationManager.notifySuccess("Media shared!");
            return true;
        } catch (e) {
            rockIt.notificationManager.notifyError((e as Error).message);
            return false;
        }
    }

    async markAsSeen(sharePublicId: string): Promise<void> {
        try {
            await fetch(
                `${BACKEND_URL}/friends/share/${sharePublicId}/seen`,
                { method: "POST", credentials: "include" }
            );
            await this.fetchInbox();
        } catch {
            // silent
        }
    }

    get inboxAtom(): ReadonlyAtom<SharedMediaItem[]> {
        return this._inboxAtom.getReadonlyAtom();
    }

    get sentAtom(): ReadonlyAtom<SharedMediaItem[]> {
        return this._sentAtom.getReadonlyAtom();
    }

    get loadingAtom(): ReadonlyAtom<boolean> {
        return this._loadingAtom.getReadonlyAtom();
    }
}
