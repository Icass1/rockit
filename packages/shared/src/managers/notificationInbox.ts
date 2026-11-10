import type { NotificationResponse } from "@/dto";
import type { NotificationInboxServices } from "@/models/interfaces/socialServices";
import {
    EWebSocketMessage,
    type WebSocketMessageHandler,
} from "@/models/types/webSocketMessages";
import {
    createArrayAtom,
    createAtom,
    type ReadonlyArrayAtom,
    type ReadonlyAtom,
} from "@/lib/store";

export class NotificationInbox {
    private _notificationsAtom = createArrayAtom<NotificationResponse>([]);
    private _unreadCount = createAtom(0);
    private _totalCount = createAtom(0);
    private _error = createAtom<string | null>(null);
    private _loading = createAtom(false);
    private _actionPending = createAtom(false);
    private _active = false;
    private _unsubscribeSession?: () => void;
    private _username?: string;
    private _generation = 0;
    private _revision = 0;
    private _offset = 0;
    private _unreadOnly = true;
    constructor(
        private readonly getServices: () => NotificationInboxServices
    ) {}

    private get services(): NotificationInboxServices {
        return this.getServices();
    }

    start(): void {
        if (this._active) return;
        this._active = true;
        this.services.webSocketManager.onMessage(
            EWebSocketMessage.NotificationState,
            this._handleState
        );
        this._unsubscribeSession =
            this.services.userManager.sessionAtom.subscribe((session) => {
                if (session?.username === this._username) return;
                this.reset(session?.username);
            });
    }

    stop(): void {
        if (!this._active) return;
        this._active = false;
        this._unsubscribeSession?.();
        this._unsubscribeSession = undefined;
        this.services.webSocketManager.offMessage(
            EWebSocketMessage.NotificationState,
            this._handleState
        );
        this.reset();
    }

    private _handleState: WebSocketMessageHandler<EWebSocketMessage.NotificationState> =
        (message) => {
            if (!this._active || !this._username) return;
            this._unreadCount.set(message.unreadCount);
            this._totalCount.set(
                this._unreadOnly ? message.unreadCount : message.totalCount
            );
        };

    private reset(username?: string): void {
        this._username = username;
        this._generation++;
        this._revision++;
        this._offset = 0;
        this._unreadOnly = true;
        this._notificationsAtom.set([]);
        this._unreadCount.set(0);
        this._totalCount.set(0);
        this._error.set(null);
        this._loading.set(false);
        this._actionPending.set(false);
        this.services.onReset?.();
    }

    private isCurrent(generation: number): boolean {
        return (
            this._active && !!this._username && generation === this._generation
        );
    }

    setPage(offset: number, unreadOnly = true): void {
        this._offset = Math.max(0, offset);
        this._unreadOnly = unreadOnly;
        void this.refreshAsync();
    }

    async refreshAsync(): Promise<void> {
        if (!this._active || !this._username) return;
        const generation = this._generation;
        const revision = ++this._revision;
        this._loading.set(true);
        try {
            const result = await this.services.http.listNotifications(
                20,
                this._offset,
                this._unreadOnly
            );
            if (!this.isCurrent(generation) || revision !== this._revision)
                return;
            if (!result.isOk()) {
                this._error.set(result.message);
                return;
            }
            this._notificationsAtom.set(result.result.items);
            this._unreadCount.set(result.result.unreadCount);
            this._totalCount.set(result.result.totalCount);
            this._error.set(null);
            if (this._offset && this._offset >= result.result.totalCount) {
                this._offset = 0;
                await this.refreshAsync();
            }
        } catch {
            if (this.isCurrent(generation) && revision === this._revision)
                this._error.set("NOTIFICATIONS_LOAD_FAILED");
        } finally {
            if (this.isCurrent(generation) && revision === this._revision)
                this._loading.set(false);
        }
    }

    async markRead(id: string): Promise<boolean> {
        return this.changeReadStateAsync(id);
    }

    async markAllReadAsync(): Promise<boolean> {
        return this.changeReadStateAsync();
    }

    private async changeReadStateAsync(id?: string): Promise<boolean> {
        if (!this._active || !this._username || this._actionPending.get())
            return false;
        const generation = this._generation;
        this._revision++;
        this._loading.set(false);
        this._actionPending.set(true);
        this._error.set(null);
        try {
            const result = id
                ? await this.services.http.markNotificationRead(id)
                : await this.services.http.markAllNotificationsRead();
            if (!this.isCurrent(generation)) return false;
            if (!result.isOk()) {
                this._error.set(result.message);
                return false;
            }
            if (!id) this._offset = 0;
            await this.refreshAsync();
            return this.isCurrent(generation);
        } catch {
            if (this.isCurrent(generation))
                this._error.set("NOTIFICATIONS_LOAD_FAILED");
            return false;
        } finally {
            if (this.isCurrent(generation)) this._actionPending.set(false);
        }
    }

    async destinationAsync(
        notification: NotificationResponse
    ): Promise<string | null> {
        if (!this._active || !this._username) return null;
        const generation = this._generation;
        try {
            const result = await this.services.http.getNotificationDestination(
                notification.publicId
            );
            if (!this.isCurrent(generation)) return null;
            if (!result.isOk()) {
                this._error.set(result.message);
                return null;
            }
            const marked = await this.markRead(notification.publicId);
            return marked && this.isCurrent(generation)
                ? result.result.url
                : null;
        } catch {
            if (this.isCurrent(generation))
                this._error.set("NOTIFICATIONS_LOAD_FAILED");
            return null;
        }
    }

    get loadingAtom(): ReadonlyAtom<boolean> {
        return this._loading.getReadonlyAtom();
    }
    get actionPendingAtom(): ReadonlyAtom<boolean> {
        return this._actionPending.getReadonlyAtom();
    }
    get notificationsAtom(): ReadonlyArrayAtom<NotificationResponse> {
        return this._notificationsAtom.getReadonlyAtom();
    }
    get unreadCountAtom(): ReadonlyAtom<number> {
        return this._unreadCount.getReadonlyAtom();
    }
    get totalCountAtom(): ReadonlyAtom<number> {
        return this._totalCount.getReadonlyAtom();
    }
    get errorAtom(): ReadonlyAtom<string | null> {
        return this._error.getReadonlyAtom();
    }
    get offset(): number {
        return this._offset;
    }
}
