import { createElement, type PointerEvent, type ReactNode } from "react";
import { NotificationInbox } from "@/managers/notificationInbox";
import { toast } from "sonner";
import { ENotificationType } from "@/models/enums/notificationType";
import type { NotificationOptions } from "@/models/interfaces/notification";
import type { NotificationServices } from "@/models/interfaces/notificationServices";
import { Http } from "@/lib/http";
import { rockIt } from "@/lib/rockit/rockIt";

const TAP_MAX_MOVEMENT_PX = 10;

export class NotificationManager extends NotificationInbox {
    constructor(dependencies?: NotificationServices) {
        super(() => ({
            ...(dependencies ?? rockIt),
            http: Http,
            onReset: () => toast.dismiss(),
        }));
    }
    override start(): void {
        if (typeof window !== "undefined") super.start();
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
