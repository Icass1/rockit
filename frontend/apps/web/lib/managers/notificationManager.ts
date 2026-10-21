import { createElement, ReactNode } from "react";
import { toast } from "sonner";
import { ENotificationType } from "@/models/enums/notificationType";
import { INotification } from "@/models/interfaces/notification";
import { ArrayAtom, createArrayAtom, ReadonlyArrayAtom } from "@/lib/store";

const TAP_MAX_MOVEMENT_PX = 10;

export class NotificationManager {
    private _notificationsAtom = createArrayAtom<INotification>([]);
    private _nextId = 0;
    private _dismissListenerRegistered = false;
    private _pointerDownPosition: { x: number; y: number } | null = null;

    notifyError(message: string): void {
        console.error("NotificationManager.notifyError", message);
        this._notify(ENotificationType.ERROR, message);
    }

    notifyInfo(message: string): void {
        console.info("NotificationManager.notifyInfo", message);
        this._notify(ENotificationType.INFO, message);
    }

    notifyWarn(message: string): void {
        console.warn("NotificationManager.notifyWarn", message);
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
    }

    get notificationsAtom(): ReadonlyArrayAtom<INotification> {
        return this._notificationsAtom.getReadonlyAtom();
    }

    get notificationsAtomForDirectAccess(): ArrayAtom<INotification> {
        return this._notificationsAtom;
    }

    private _notify(type: ENotificationType, message: string): void {
        const numericId = this._nextId++;
        const sonnerId = `rockit-notification-${numericId}`;

        this._notificationsAtom.push({
            id: numericId,
            message,
            type,
        });

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
