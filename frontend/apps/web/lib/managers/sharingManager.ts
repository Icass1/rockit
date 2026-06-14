import { type SharedMediaItem } from "@/dto";
import { Http } from "@/lib/http";
import { rockIt } from "@/lib/rockit/rockIt";
import { createArrayAtom, createAtom, ReadonlyAtom } from "@/lib/store";

export class SharingManager {
    private _inboxAtom = createArrayAtom<SharedMediaItem>([]);
    private _sentAtom = createArrayAtom<SharedMediaItem>([]);
    private _loadingAtom = createAtom<boolean>(false);

    async fetchInbox(): Promise<void> {
        this._loadingAtom.set(true);
        try {
            const res = await Http.getShareInbox();
            if (res.isOk()) {
                this._inboxAtom.set(res.result.items);
            }
        } catch {
            // silent
        } finally {
            this._loadingAtom.set(false);
        }
    }

    async fetchSent(): Promise<void> {
        try {
            const res = await Http.getShareSent();
            if (res.isOk()) {
                this._sentAtom.set(res.result.items);
            }
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
            const res = await Http.shareMedia({
                recipientPublicId,
                mediaPublicId,
                message: message ?? null,
            });
            if (res.isNotOk()) throw new Error(String(res.detail));
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
            await Http.markShareAsSeen(sharePublicId);
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
