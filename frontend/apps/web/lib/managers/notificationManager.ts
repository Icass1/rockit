import { createElement, ReactNode } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { ENotificationType } from "@/models/enums/notificationType";
import {
    INotification,
    NotificationOptions,
    NotificationSchema,
} from "@/models/interfaces/notification";
import { RELEASES } from "@/lib/notifications/releases";
import { ArrayAtom, createArrayAtom, ReadonlyArrayAtom } from "@/lib/store";

const TAP_MAX_MOVEMENT_PX = 10;

export class NotificationManager {
    private _notificationsAtom = createArrayAtom<INotification>([]);
    private _nextId = 0;
    private _dismissListenerRegistered = false;
    private _pointerDownPosition: { x: number; y: number } | null = null;

    private _storageKey?: string;
    private _seenKeys = new Set<string>();

    setUser(username?: string): void {
        const key = username
            ? `rockit.notifications.v1:${encodeURIComponent(username)}`
            : undefined;
        if (key === this._storageKey) return;
        toast.dismiss();
        this._storageKey = key;
        this._seenKeys.clear();
        this._notificationsAtom.set([]);
        if (!key || typeof window === "undefined") return;
        try {
            const stored = z
                .object({
                    items: z.array(NotificationSchema).max(100),
                    seen: z.array(z.string()).max(1000),
                })
                .parse(
                    JSON.parse(
                        localStorage.getItem(key) || '{"items":[],"seen":[]}'
                    )
                );
            this._notificationsAtom.set(stored.items);
            this._seenKeys = new Set(stored.seen);
            this._nextId = Math.max(
                this._nextId,
                ...stored.items.map((n) => n.id + 1)
            );
        } catch {
            /* Unavailable or outdated storage must not block the app. */
        }
    }

    announceReleases(vocabulary: Record<string, string>): void {
        if (!this._storageKey) return;
        for (const release of [...RELEASES].reverse()) {
            this.notify(
                ENotificationType.INFO,
                `RockIt ${release.version} · ${vocabulary[release.titleKey]}`,
                {
                    category: "release",
                    key: `release:${release.version}`,
                    detail: vocabulary[release.detailKey],
                    toast: false,
                }
            );
        }
    }

    markRead(id: number): void {
        this._notificationsAtom.set(
            this._notificationsAtom
                .get()
                .map((n) => (n.id === id ? { ...n, read: true } : n))
        );
        this._persist();
    }

    markAllRead(): void {
        this._notificationsAtom.set(
            this._notificationsAtom.get().map((n) => ({ ...n, read: true }))
        );
        this._persist();
    }

    clearRead(): void {
        this._notificationsAtom.set(
            this._notificationsAtom.get().filter((n) => !n.read)
        );
        this._persist();
    }

    private _persist(): void {
        if (!this._storageKey || typeof window === "undefined") return;
        try {
            localStorage.setItem(
                this._storageKey,
                JSON.stringify({
                    items: this._notificationsAtom.get(),
                    seen: [...this._seenKeys].slice(-1000),
                })
            );
        } catch {
            /* Storage can be full or disabled. Keep the in-memory history. */
        }
    }

    notifyError(message: string): void {
        console.error("NotificationManager.notifyError", message);
        this._notify(ENotificationType.ERROR, message);
    }

    notifyInfo(message: string): void {
        console.info("NotificationManager.notifyInfo", message);
        this._notify(ENotificationType.INFO, message);
    }

    notifyWarn(message: string): void {
        this._notify(ENotificationType.WARN, message);
    }

    notifySuccess(message: string): void {
        console.info("NotificationManager.notifySuccess", message);
        this._notify(ENotificationType.SUCCESS, message);
    }

    dismiss(id: number): void {
        const current = this._notificationsAtom.get();
        this._notificationsAtom.set(
            current.filter((n): boolean => n.id !== id)
        );
        this._persist();
    }

    get notificationsAtom(): ReadonlyArrayAtom<INotification> {
        return this._notificationsAtom.getReadonlyAtom();
    }

    get notificationsAtomForDirectAccess(): ArrayAtom<INotification> {
        return this._notificationsAtom;
    }

    private _notify(type: ENotificationType, message: string): void {
        this.notify(type, message);
    }

    notify(
        type: ENotificationType,
        message: string,
        options: NotificationOptions = {}
    ): void {
        if (options.key && this._seenKeys.has(options.key)) return;
        if (options.key) this._seenKeys.add(options.key);
        // Bound both history and deduplication metadata.
        this._seenKeys = new Set([...this._seenKeys].slice(-1000));
        const numericId = this._nextId++;
        const sonnerId = `rockit-notification-${numericId}`;

        this._notificationsAtom.set(
            [
                {
                    id: numericId,
                    message,
                    type,
                    category: options.category ?? "activity",
                    createdAt: Date.now(),
                    read: false,
                    key: options.key,
                    detail: options.detail,
                },
                ...this._notificationsAtom.get(),
            ].slice(0, 100)
        );
        this._persist();
        if (options.toast === false) return;

        this._ensureDismissListener();

        // Sonner's built-in tap-to-dismiss relies on a click event that iOS
        // Safari often suppresses because the toast calls setPointerCapture()
        // during touch sequences. Wrapping the content with a marker attribute
        // lets the delegated pointerup listener below dismiss reliably on
        // every platform.
        const content: ReactNode = createElement(
            "div",
            {
                "data-notification-dismiss": sonnerId,
                className: "cursor-pointer",
            },
            message
        );
        const data = {
            id: sonnerId,
            dismissible: true,
        };

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
            case ENotificationType.INFO:
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
