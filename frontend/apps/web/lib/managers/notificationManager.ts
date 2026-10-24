import { createElement, ReactNode } from "react";
import { toast } from "sonner";
import { ENotificationType } from "@/models/enums/notificationType";
import {
    INotification,
    LegacyNotificationsStorageSchema,
    NotificationOptions,
    NotificationSchema,
} from "@/models/interfaces/notification";
import { Http } from "@/lib/http";
import { createArrayAtom, ReadonlyArrayAtom } from "@/lib/store";

const TAP_MAX_MOVEMENT_PX = 10;

export class NotificationManager {
    private _notificationsAtom = createArrayAtom<INotification>([]);
    private _dismissListenerRegistered = false;
    private _pointerDownPosition: { x: number; y: number } | null = null;
    private _username?: string;
    private _generation = 0;
    private _revision = 0;
    private _loaded = false;
    private _migration?: Promise<void>;
    private _refresh?: Promise<void>;
    private _refreshAgain = false;
    private _timer?: ReturnType<typeof setInterval>;
    private _refreshListener = (): void => {
        void this.refreshAsync();
    };
    private _writeQueue: Promise<void> = Promise.resolve();

    setUser(username?: string): void {
        if (username === this._username) return;
        this._username = username;
        this._generation++;
        this._revision++;
        this._loaded = false;
        this._migration = undefined;
        this._refresh = undefined;
        this._refreshAgain = false;
        this._writeQueue = Promise.resolve();
        toast.dismiss();
        this._notificationsAtom.set([]);
        if (this._timer) clearInterval(this._timer);
        if (typeof window === "undefined") return;
        window.removeEventListener("focus", this._refreshListener);
        window.removeEventListener("online", this._refreshListener);
        if (!username) return;
        window.addEventListener("focus", this._refreshListener);
        window.addEventListener("online", this._refreshListener);
        this._timer = setInterval(this._refreshListener, 30000);
        void this.refreshAsync();
    }

    async refreshAsync(): Promise<void> {
        if (!this._username || typeof window === "undefined") return;
        if (this._refresh) {
            this._refreshAgain = true;
            return this._refresh;
        }
        const generation = this._generation;
        const request = (async (): Promise<void> => {
            do {
                this._refreshAgain = false;
                await this._refreshInboxAsync(generation);
            } while (generation === this._generation && this._refreshAgain);
        })();
        this._refresh = request;
        try {
            await request;
        } finally {
            if (this._refresh === request) {
                this._refresh = undefined;
                this._refreshAgain = false;
            }
        }
    }

    private async _refreshInboxAsync(generation: number): Promise<void> {
        this._migration ??= this._migrateLegacyAsync(generation);
        await this._migration;
        if (generation !== this._generation) return;
        this._migration = undefined;
        const revision = ++this._revision;
        const result = await Http.getNotifications();
        if (generation !== this._generation || revision !== this._revision)
            return;
        if (result.isNotOk() || !result.result) return;
        const parsed = NotificationSchema.array().safeParse(
            result.result.items
        );
        if (!parsed.success) return;
        const previous = new Set(
            this._notificationsAtom.get().map((n) => n.id)
        );
        if (this._loaded) {
            for (const item of [...parsed.data].reverse()) {
                if (
                    !item.read &&
                    item.category !== "release" &&
                    !previous.has(item.id)
                )
                    this._showToast(item.type, item.message, item.id);
            }
        }
        this._loaded = true;
        this._notificationsAtom.set(parsed.data);
    }

    private async _migrateLegacyAsync(generation: number): Promise<void> {
        const key = `rockit.notifications.v1:${encodeURIComponent(this._username!)}`;
        try {
            if (localStorage.getItem(`${key}:migrated`)) return;
            const raw = localStorage.getItem(key);
            if (!raw) return;
            const legacy = LegacyNotificationsStorageSchema.safeParse(
                JSON.parse(raw)
            );
            if (!legacy.success || generation !== this._generation) return;
            const result = await Http.migrateLegacyNotifications(legacy.data);
            if (result.isNotOk()) {
                console.error("Cannot migrate notifications", result.message);
                return;
            }
            // Keep the original browser data as a backup; it is no longer the inbox.
            localStorage.setItem(`${key}:migrated`, "true");
        } catch {
            // Private browsing or malformed old storage must not block the server inbox.
        }
    }

    markRead(id: string): void {
        this._markRead([id]);
    }

    markAllRead(): void {
        this._markRead(
            this._notificationsAtom
                .get()
                .filter((n) => !n.read)
                .map((n) => n.id)
        );
    }

    private _markRead(ids: string[]): void {
        if (!this._username || ids.length === 0) return;
        const generation = this._generation;
        // Invalidate any older inbox response while the write is in flight.
        this._revision++;
        this._writeQueue = this._writeQueue
            .then(async (): Promise<void> => {
                if (generation !== this._generation) return;
                const result = await Http.markNotificationsRead({ ids });
                if (generation !== this._generation) return;
                if (result.isNotOk()) {
                    console.error(
                        "Cannot mark notifications read",
                        result.message
                    );
                    return;
                }
                this._revision++;
                this._notificationsAtom.set(
                    this._notificationsAtom
                        .get()
                        .map((n) =>
                            ids.includes(n.id) ? { ...n, read: true } : n
                        )
                );
                await this.refreshAsync();
            })
            .catch((error: unknown): void => {
                console.error("Notification update failed", error);
            });
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

    dismiss(id: string): void {
        this.markRead(id);
        toast.dismiss(`rockit-notification-${id}`);
    }

    get notificationsAtom(): ReadonlyArrayAtom<INotification> {
        return this._notificationsAtom.getReadonlyAtom();
    }

    notify(
        type: ENotificationType,
        message: string,
        options: NotificationOptions = {}
    ): void {
        // Server operations produce their own history; UI feedback stays immediate.
        if (options.toast !== false) this._showToast(type, message);
        if (
            !this._username ||
            (options.category && options.category !== "activity")
        ) {
            void this.refreshAsync();
            return;
        }
        const generation = this._generation;
        const key = options.key ?? crypto.randomUUID();
        this._writeQueue = this._writeQueue
            .then(async (): Promise<void> => {
                if (generation !== this._generation) return;
                const result = await Http.createNotificationActivity({
                    type,
                    message,
                    detail: options.detail ?? null,
                    key,
                });
                if (generation !== this._generation) return;
                if (result.isNotOk()) {
                    console.error("Cannot save notification", result.message);
                    return;
                }
                // The immediate toast above already showed this activity.
                this._loaded = false;
                await this.refreshAsync();
            })
            .catch((error: unknown): void => {
                console.error("Notification update failed", error);
            });
    }

    private _showToast(
        type: ENotificationType,
        message: string,
        id: string = crypto.randomUUID()
    ): void {
        if (typeof window === "undefined") return;
        this._ensureDismissListener();
        const sonnerId = `rockit-notification-${id}`;
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
