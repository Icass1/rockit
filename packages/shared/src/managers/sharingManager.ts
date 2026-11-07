import { type SharedMediaItem } from "@/dto";
import type { SharingServices } from "@/models/interfaces/socialServices";
import { isQueueable } from "@/models/types/media";
import {
    EWebSocketMessage,
    type WebSocketMessageHandler,
} from "@/models/types/webSocketMessages";
import { createArrayAtom, createAtom, ReadonlyAtom } from "@/lib/store";

export class SharingManager {
    private _active = false;
    private _unsubscribeSession?: () => void;
    private _username?: string;
    private _generation = 0;
    private _inboxRevision = 0;
    private _sentRevision = 0;
    private _composeRevision = 0;

    constructor(private readonly getServices: () => SharingServices) {}

    private get services(): SharingServices {
        return this.getServices();
    }

    private isCurrent(generation: number): boolean {
        return (
            this._active && !!this._username && generation === this._generation
        );
    }

    private actionError(): void {
        this.services.notificationManager.notifyError(
            this.services.vocabularyManager.vocabulary.FRIENDS_ACTION_ERROR
        );
    }

    private _composeMediaAtom = createAtom<string | null>(null);
    compose(publicId: string): void {
        if (!this.isCurrent(this._generation)) return;
        this._composeRevision++;
        this._composeMediaAtom.set(publicId);
    }
    closeComposer(): void {
        this._composeRevision++;
        this._composeMediaAtom.set(null);
    }
    get composeMediaAtom(): ReadonlyAtom<string | null> {
        return this._composeMediaAtom.getReadonlyAtom();
    }

    private _inboxAtom = createArrayAtom<SharedMediaItem>([]);
    private _sentAtom = createArrayAtom<SharedMediaItem>([]);
    private _loadingAtom = createAtom<boolean>(false);

    private _errorAtom = createAtom<string | null>(null);

    start(): void {
        if (this._active) return;
        this._active = true;
        this.services.webSocketManager.onMessage(
            EWebSocketMessage.SocialChanged,
            this._handleSocial
        );
        this._unsubscribeSession =
            this.services.userManager.sessionAtom.subscribe((session) => {
                if (session?.username === this._username) return;
                this.reset(session?.username);
                if (this._username) {
                    void this.fetchInbox();
                    void this.fetchSent();
                }
            });
    }

    stop(): void {
        if (!this._active) return;
        this._active = false;
        this._unsubscribeSession?.();
        this._unsubscribeSession = undefined;
        this.services.webSocketManager.offMessage(
            EWebSocketMessage.SocialChanged,
            this._handleSocial
        );
        this.reset();
    }

    private reset(username?: string): void {
        this._username = username;
        this._generation++;
        this.closeComposer();
        this._inboxAtom.set([]);
        this._sentAtom.set([]);
        this._loadingAtom.set(false);
        this._errorAtom.set(null);
    }

    private _handleSocial: WebSocketMessageHandler<EWebSocketMessage.SocialChanged> =
        () => {
            if (!this.isCurrent(this._generation)) return;
            void this.fetchInbox();
            void this.fetchSent();
        };

    async queueSharedMedia(publicId: string): Promise<void> {
        const generation = this._generation;
        if (!this.isCurrent(generation)) return;
        try {
            const result = await this.services.mediaManager.getMedia(publicId);
            if (!this.isCurrent(generation)) return;
            if (!result.isOk()) throw new Error(String(result.detail));
            const media = result.result.media;
            if (isQueueable(media))
                this.services.queueManager.addMediaToEnd(media);
        } catch {
            if (this.isCurrent(generation)) this.actionError();
        }
    }

    async playSharedMedia(publicId: string): Promise<void> {
        const generation = this._generation;
        if (!this.isCurrent(generation)) return;
        try {
            const result = await this.services.mediaManager.getMedia(publicId);
            if (!this.isCurrent(generation)) return;
            if (!result.isOk()) throw new Error(String(result.detail));
            const media = result.result.media;
            if (isQueueable(media)) {
                this.services.queueManager.setMedia([media], "");
                this.services.queueManager.moveToMedia(publicId);
                this.services.mediaPlayerManager.play();
            }
        } catch {
            if (this.isCurrent(generation)) this.actionError();
        }
    }

    async fetchInbox(): Promise<void> {
        const generation = this._generation;
        if (!this.isCurrent(generation)) return;
        const revision = ++this._inboxRevision;
        this._loadingAtom.set(true);
        this._errorAtom.set(null);
        try {
            const result = await this.services.http.getShareInbox();
            if (!this.isCurrent(generation) || revision !== this._inboxRevision)
                return;
            if (!result.isOk()) throw new Error(String(result.detail));
            this._inboxAtom.set(result.result.items);
        } catch {
            if (this.isCurrent(generation) && revision === this._inboxRevision)
                this._errorAtom.set(
                    this.services.vocabularyManager.vocabulary
                        .FRIENDS_LOAD_ERROR
                );
        } finally {
            if (this.isCurrent(generation) && revision === this._inboxRevision)
                this._loadingAtom.set(false);
        }
    }

    async fetchSent(): Promise<void> {
        const generation = this._generation;
        if (!this.isCurrent(generation)) return;
        const revision = ++this._sentRevision;
        this._errorAtom.set(null);
        try {
            const result = await this.services.http.getShareSent();
            if (!this.isCurrent(generation) || revision !== this._sentRevision)
                return;
            if (!result.isOk()) throw new Error(String(result.detail));
            this._sentAtom.set(result.result.items);
        } catch {
            if (this.isCurrent(generation) && revision === this._sentRevision)
                this._errorAtom.set(
                    this.services.vocabularyManager.vocabulary
                        .FRIENDS_LOAD_ERROR
                );
        }
    }

    async shareMedia(
        recipientPublicId: string,
        mediaPublicId: string,
        message?: string
    ): Promise<boolean> {
        const generation = this._generation;
        const composer = this._composeRevision;
        if (!this.isCurrent(generation)) return false;
        try {
            const res = await this.services.http.shareMedia({
                recipientPublicId,
                mediaPublicId,
                message: message ?? null,
            });
            if (!this.isCurrent(generation)) return false;
            if (!res.isOk()) throw new Error(String(res.detail));
            await this.fetchSent();
            if (
                !this.isCurrent(generation) ||
                composer !== this._composeRevision
            )
                return false;
            this.services.notificationManager.notifySuccess(
                this.services.vocabularyManager.vocabulary.FRIENDS_MEDIA_SHARED
            );
            return true;
        } catch {
            if (
                !this.isCurrent(generation) ||
                composer !== this._composeRevision
            )
                return false;
            this.services.notificationManager.notifyError(
                this.services.vocabularyManager.vocabulary.FRIENDS_ACTION_ERROR
            );
            return false;
        }
    }

    async deleteShare(publicId: string): Promise<void> {
        const generation = this._generation;
        if (!this.isCurrent(generation)) return;
        try {
            const result = await this.services.http.deleteShare(publicId);
            if (!this.isCurrent(generation)) return;
            if (!result.isOk()) throw new Error(String(result.detail));
            await Promise.all([this.fetchInbox(), this.fetchSent()]);
        } catch {
            if (this.isCurrent(generation)) this.actionError();
        }
    }

    async markAsSeen(sharePublicId: string): Promise<void> {
        const generation = this._generation;
        if (!this.isCurrent(generation)) return;
        try {
            const result =
                await this.services.http.markShareSeen(sharePublicId);
            if (!this.isCurrent(generation)) return;
            if (!result.isOk()) throw new Error(String(result.detail));
            await this.fetchInbox();
        } catch {
            if (this.isCurrent(generation)) this.actionError();
        }
    }

    get errorAtom(): ReadonlyAtom<string | null> {
        return this._errorAtom.getReadonlyAtom();
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
