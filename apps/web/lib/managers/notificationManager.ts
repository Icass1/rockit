import { createElement, type PointerEvent, type ReactNode } from "react";
import {
    EWebSocketMessage,
    type NotificationResponse,
    type WebSocketMessageHandler,
} from "@rockit/shared";
import { toast } from "sonner";
import { ENotificationType } from "@/models/enums/notificationType";
import type {
    INotification,
    NotificationOptions,
} from "@/models/interfaces/notification";
import type { NotificationServices } from "@/models/interfaces/notificationServices";
import { Http } from "@/lib/http";
import { rockIt } from "@/lib/rockit/rockIt";
import {
    createArrayAtom,
    createAtom,
    ReadonlyArrayAtom,
    ReadonlyAtom,
} from "@/lib/store";

const TAP_MAX_MOVEMENT_PX = 10;

export class NotificationManager {
    private _notificationsAtom = createArrayAtom<INotification>([]);
    private _unreadCount = createAtom(0);
    private _totalCount = createAtom(0);
    private _error = createAtom<string | null>(null);
    private _active = false;
    private _unsubscribeSession?: () => void;
    private _username?: string;
    private _generation = 0;
    private _revision = 0;
    private _offset = 0;
    private _unreadOnly = false;
    constructor(private readonly dependencies?: NotificationServices) {}

    private get services(): NotificationServices {
        return this.dependencies ?? rockIt;
    }

    start(): void {
        if (this._active || typeof window === "undefined") return;
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
            this._totalCount.set(message.totalCount);
        };

    private reset(username?: string): void {
        this._username = username;
        this._generation++;
        this._revision++;
        this._offset = 0;
        this._unreadOnly = false;
        this._notificationsAtom.set([]);
        this._unreadCount.set(0);
        this._totalCount.set(0);
        this._error.set(null);
        toast.dismiss();
    }

    private isCurrent(generation: number): boolean {
        return (
            this._active && !!this._username && generation === this._generation
        );
    }

    setPage(offset: number, unreadOnly = false): void {
        this._offset = Math.max(0, offset);
        this._unreadOnly = unreadOnly;
        void this.refreshAsync();
    }

    async refreshAsync(): Promise<void> {
        if (!this._active || !this._username) return;
        const generation = this._generation;
        const revision = ++this._revision;
        try {
            const result = await Http.listNotifications(
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
        }
    }

    async markRead(id: string): Promise<boolean> {
        if (!this._active || !this._username) return false;
        const generation = this._generation;
        this._revision++;
        try {
            const result = await Http.markNotificationRead(id);
            if (!this.isCurrent(generation)) return false;
            if (!result.isOk()) {
                this._error.set(result.message);
                return false;
            }
            await this.refreshAsync();
            return this.isCurrent(generation);
        } catch {
            if (this.isCurrent(generation))
                this._error.set("NOTIFICATIONS_LOAD_FAILED");
            return false;
        }
    }

    async destinationAsync(
        notification: NotificationResponse
    ): Promise<string | null> {
        if (!this._active || !this._username) return null;
        const generation = this._generation;
        try {
            const result = await Http.getNotificationDestination(
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

    get notificationsAtom(): ReadonlyArrayAtom<INotification> {
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

    notifyError(message: string): void {
        this.notify(ENotificationType.ERROR, message);
    }
    notifyInfo(message: string): void {
        this.notify(ENotificationType.INFO, message);
    }
    notifyWarn(message: string): void {
        this.notify(ENotificationType.WARN, message);
    }
    notifySuccess(message: string): void {
        this.notify(ENotificationType.SUCCESS, message);
    }
    notify(
        type: ENotificationType,
        message: string,
        options: NotificationOptions = {}
    ): void {
        // Immediate UI feedback stays local. Only registered server events create inbox history.
        if (options.toast !== false) this._showToast(type, message);
        if (options.category) void this.refreshAsync();
    }

    private _showToast(
        type: ENotificationType,
        message: string,
        id?: string
    ): void {
        if (typeof window === "undefined") return;
        const notificationId =
            id ??
            (typeof globalThis.crypto?.randomUUID === "function"
                ? globalThis.crypto.randomUUID()
                : `${Date.now()}-${Math.random().toString(36).slice(2)}`);
        const sonnerId = `rockit-notification-${notificationId}`;
        // React owns these handlers with the toast, including outside the app shell.
        let pointerDownPosition: { x: number; y: number } | undefined;
        const content: ReactNode = createElement(
            "div",
            {
                "data-notification-dismiss": sonnerId,
                className: "cursor-pointer",
                onPointerDown: (event: PointerEvent<HTMLDivElement>): void => {
                    pointerDownPosition = {
                        x: event.clientX,
                        y: event.clientY,
                    };
                },
                onPointerCancel: (): void => {
                    pointerDownPosition = undefined;
                },
                onPointerUp: (event: PointerEvent<HTMLDivElement>): void => {
                    const start = pointerDownPosition;
                    pointerDownPosition = undefined;
                    if (
                        start &&
                        Math.abs(event.clientX - start.x) <=
                            TAP_MAX_MOVEMENT_PX &&
                        Math.abs(event.clientY - start.y) <= TAP_MAX_MOVEMENT_PX
                    )
                        toast.dismiss(sonnerId);
                },
            },
            message
        );
        const data = { id: sonnerId, dismissible: true };
        switch (type) {
            case ENotificationType.ERROR:
                toast.error(content, data);
                break;
            case ENotificationType.WARN:
                toast.warning(content, data);
                break;
            case ENotificationType.SUCCESS:
                toast.success(content, data);
                break;
            default:
                toast(content, data);
                break;
        }
    }
}
