import { createElement, ReactNode } from "react";
import { toast } from "sonner";
import type { NotificationResponse } from "@rockit/shared";
import { ENotificationType } from "@/models/enums/notificationType";
import type { INotification, NotificationOptions } from "@/models/interfaces/notification";
import { Http } from "@/lib/http";
import { createArrayAtom, createAtom, ReadonlyArrayAtom, ReadonlyAtom } from "@/lib/store";

const TAP_MAX_MOVEMENT_PX = 10;

export class NotificationManager {
    private _notificationsAtom = createArrayAtom<INotification>([]);
    private _unreadCount = createAtom(0);
    private _totalCount = createAtom(0);
    private _error = createAtom<string | null>(null);
    private _dismissListenerRegistered = false;
    private _pointerDownPosition: { x: number; y: number } | null = null;
    private _username?: string;
    private _generation = 0;
    private _revision = 0;
    private _offset = 0;
    private _unreadOnly = false;
    private _timer?: ReturnType<typeof setInterval>;
    private _refreshListener = (): void => {
        if (document.visibilityState !== "hidden") void this.refreshAsync();
    };

    init(): void {
        if (typeof window === "undefined") return;
        rockIt.webSocketManager.onMessage(
            EWebSocketMessage.NotificationsChanged,
            () => void this.refreshAsync()
        );
    }

    setUser(username?: string): void {
        if (username === this._username) return;
        this._username = username;
        this._generation++;
        this._revision++;
        this._offset = 0;
        this._notificationsAtom.set([]);
        this._unreadCount.set(0);
        this._totalCount.set(0);
        this._error.set(null);
        toast.dismiss();
        if (this._timer) clearInterval(this._timer);
        if (typeof window === "undefined") return;
        window.removeEventListener("focus", this._refreshListener);
        window.removeEventListener("online", this._refreshListener);
        document.removeEventListener("visibilitychange", this._refreshListener);
        if (!username) return;
        window.addEventListener("focus", this._refreshListener);
        window.addEventListener("online", this._refreshListener);
        document.addEventListener("visibilitychange", this._refreshListener);
        this._timer = setInterval(this._refreshListener, 30_000);
        void this.refreshAsync();
    }

    setPage(offset: number, unreadOnly = false): void {
        this._offset = Math.max(0, offset);
        this._unreadOnly = unreadOnly;
        void this.refreshAsync();
    }

    async refreshAsync(): Promise<void> {
        if (!this._username || typeof window === "undefined") return;
        const generation = this._generation;
        const revision = ++this._revision;
        try {
            const result = await Http.listNotifications(20, this._offset, this._unreadOnly);
            if (generation !== this._generation || revision !== this._revision) return;
            if (!result.isOk()) { this._error.set(result.message); return; }
            this._notificationsAtom.set(result.result.items);
            this._unreadCount.set(result.result.unreadCount);
            this._totalCount.set(result.result.totalCount);
            this._error.set(null);
            if (this._offset && this._offset >= result.result.totalCount) {
                this._offset = 0;
                await this.refreshAsync();
            }
        } catch {
            if (generation === this._generation && revision === this._revision)
                this._error.set("NOTIFICATIONS_LOAD_FAILED");
        }
    }

    async markRead(id: string): Promise<boolean> {
        const generation = this._generation;
        this._revision++;
        const result = await Http.markNotificationRead(id);
        if (generation !== this._generation) return false;
        if (!result.isOk()) { this._error.set(result.message); return false; }
        await this.refreshAsync();
        return true;
    }

    async destinationAsync(notification: NotificationResponse): Promise<string | null> {
        const generation = this._generation;
        const result = await Http.getNotificationDestination(notification.publicId);
        if (generation !== this._generation) return null;
        if (!result.isOk()) { this._error.set(result.message); return null; }
        return await this.markRead(notification.publicId) ? result.result.url : null;
    }

    get notificationsAtom(): ReadonlyArrayAtom<INotification> { return this._notificationsAtom.getReadonlyAtom(); }
    get unreadCountAtom(): ReadonlyAtom<number> { return this._unreadCount.getReadonlyAtom(); }
    get totalCountAtom(): ReadonlyAtom<number> { return this._totalCount.getReadonlyAtom(); }
    get errorAtom(): ReadonlyAtom<string | null> { return this._error.getReadonlyAtom(); }
    get offset(): number { return this._offset; }

    notifyError(message: string): void { this.notify(ENotificationType.ERROR, message); }
    notifyInfo(message: string): void { this.notify(ENotificationType.INFO, message); }
    notifyWarn(message: string): void { this.notify(ENotificationType.WARN, message); }
    notifySuccess(message: string): void { this.notify(ENotificationType.SUCCESS, message); }
    notify(type: ENotificationType, message: string, options: NotificationOptions = {}): void {
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
        this._ensureDismissListener();
        const notificationId =
            id ??
            (typeof globalThis.crypto?.randomUUID === "function"
                ? globalThis.crypto.randomUUID()
                : `${Date.now()}-${Math.random().toString(36).slice(2)}`);
        const sonnerId = `rockit-notification-${notificationId}`;
        const content: ReactNode = createElement(
            "div",
            {
                "data-notification-dismiss": sonnerId,
                className: "cursor-pointer",
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

    private _ensureDismissListener(): void {
        if (this._dismissListenerRegistered || typeof window === "undefined") {
            return;
        }
        document.addEventListener(
            "pointerdown",
            (event: PointerEvent): void => {
                this._pointerDownPosition =
                    event.target instanceof Element &&
                    event.target.closest("[data-notification-dismiss]")
                        ? { x: event.clientX, y: event.clientY }
                        : null;
            },
            true
        );
        document.addEventListener(
            "pointerup",
            (event: PointerEvent): void => {
                const startPosition = this._pointerDownPosition;
                this._pointerDownPosition = null;
                if (!startPosition) return;
                if (!(event.target instanceof Element)) return;
                if (
                    !event.target.closest("[data-notification-dismiss]") &&
                    !document
                        .elementFromPoint(event.clientX, event.clientY)
                        ?.closest("[data-notification-dismiss]")
                ) {
                    return;
                }
                // Ignore drags/swipes/scrolls so only real taps dismiss.
                const deltaX = Math.abs(event.clientX - startPosition.x);
                const deltaY = Math.abs(event.clientY - startPosition.y);
                if (
                    deltaX > TAP_MAX_MOVEMENT_PX ||
                    deltaY > TAP_MAX_MOVEMENT_PX
                ) {
                    return;
                }
                const element = event.target.closest(
                    "[data-notification-dismiss]"
                );
                if (!element) return;
                const sonnerId = element.getAttribute(
                    "data-notification-dismiss"
                );
                if (!sonnerId) return;
                toast.dismiss(sonnerId);
            },
            true
        );
        this._dismissListenerRegistered = true;
    }
}
