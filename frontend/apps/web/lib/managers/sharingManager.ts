import { type SharedMediaItem } from "@/dto";
import { EWebSocketMessage, isQueueable } from "@rockit/shared";
import { Http } from "@/lib/http";
import { rockIt } from "@/lib/rockit/rockIt";
import { createArrayAtom, createAtom, ReadonlyAtom } from "@/lib/store";

export class SharingManager {
    private _composeMediaAtom = createAtom<string | null>(null);
    compose(publicId: string): void {
        this._composeMediaAtom.set(publicId);
    }
    closeComposer(): void {
        this._composeMediaAtom.set(null);
    }
    get composeMediaAtom(): ReadonlyAtom<string | null> {
        return this._composeMediaAtom.getReadonlyAtom();
    }

    private _inboxAtom = createArrayAtom<SharedMediaItem>([]);
    private _sentAtom = createArrayAtom<SharedMediaItem>([]);
    private _loadingAtom = createAtom<boolean>(false);

    private _initialized = false;
    init(): void {
        if (this._initialized || typeof window === "undefined") return;
        this._initialized = true;
        rockIt.webSocketManager.onMessage(
            EWebSocketMessage.SocialChanged,
            () => {
                void this.fetchInbox();
                void this.fetchSent();
            }
        );
        rockIt.userManager.loggedInAtom.subscribe((loggedIn) => {
            if (loggedIn) {
                void this.fetchInbox();
                void this.fetchSent();
            } else {
                this._inboxAtom.set([]);
                this._sentAtom.set([]);
                this.closeComposer();
            }
        });
    }

    async queueSharedMedia(publicId: string): Promise<void> {
        const result = await rockIt.mediaManager.getMedia(publicId);
        if (!result.isOk()) {
            rockIt.notificationManager.notifyError(String(result.detail));
            return;
        }
        const media = result.result.media;
        if (isQueueable(media)) rockIt.queueManager.addMediaToEnd(media);
    }

    async playSharedMedia(publicId: string): Promise<void> {
        const result = await rockIt.mediaManager.getMedia(publicId);
        if (!result.isOk()) {
            rockIt.notificationManager.notifyError(String(result.detail));
            return;
        }
        const media = result.result.media;
        if (isQueueable(media)) {
            rockIt.queueManager.setMedia([media], "");
            rockIt.queueManager.moveToMedia(publicId);
            rockIt.mediaPlayerManager.play();
        }
    }

    async fetchInbox(): Promise<void> {
        const requestingUser = rockIt.userManager.usernameAtom.get();
        if (!rockIt.userManager.loggedInAtom.get()) return;
        this._loadingAtom.set(true);
        try {
            const res = await Http.getShareInbox();
            if (
                !rockIt.userManager.loggedInAtom.get() ||
                requestingUser !== rockIt.userManager.usernameAtom.get()
            )
                return;
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
        const requestingUser = rockIt.userManager.usernameAtom.get();
        if (!rockIt.userManager.loggedInAtom.get()) return;
        try {
            const res = await Http.getShareSent();
            if (
                !rockIt.userManager.loggedInAtom.get() ||
                requestingUser !== rockIt.userManager.usernameAtom.get()
            )
                return;
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
            if (!res.isOk()) throw new Error(String(res.detail));
            await this.fetchSent();
            rockIt.notificationManager.notifySuccess(
                rockIt.vocabularyManager.vocabulary.FRIENDS_MEDIA_SHARED
            );
            return true;
        } catch (e) {
            rockIt.notificationManager.notifyError((e as Error).message);
            return false;
        }
    }

    async deleteShare(publicId: string): Promise<void> {
        const result = await Http.deleteShare(publicId);
        if (!result.isOk()) {
            rockIt.notificationManager.notifyError(String(result.detail));
            return;
        }
        await Promise.all([this.fetchInbox(), this.fetchSent()]);
    }

    async markAsSeen(sharePublicId: string): Promise<void> {
        try {
            await Http.markShareSeen(sharePublicId);
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
