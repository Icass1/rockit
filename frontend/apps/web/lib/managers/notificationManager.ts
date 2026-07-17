import { toast } from "sonner";
import { ENotificationType } from "@/models/enums/notificationType";
import { INotification } from "@/models/interfaces/notification";
import { ArrayAtom, createArrayAtom, ReadonlyArrayAtom } from "@/lib/store";

export class NotificationManager {
    private _notificationsAtom = createArrayAtom<INotification>([]);
    private _nextId = 0;

    notifyError(message: string): void {
        console.error("NotificationManager.notifyError", message);
        const id = this._nextId++;
        this._notificationsAtom.push({
            id,
            message,
            type: ENotificationType.ERROR,
        });
        toast.error(message, { dismissible: true });
    }

    notifyInfo(message: string): void {
        console.info("NotificationManager.notifyInfo", message);
        const id = this._nextId++;
        this._notificationsAtom.push({
            id,
            message,
            type: ENotificationType.INFO,
        });
        toast(message, { dismissible: true });
    }

    notifyWarn(message: string): void {
        console.warn("NotificationManager.notifyWarn", message);
        const id = this._nextId++;
        this._notificationsAtom.push({
            id,
            message,
            type: ENotificationType.WARN,
        });
        toast.warning(message, { dismissible: true });
    }

    notifySuccess(message: string): void {
        console.info("NotificationManager.notifySuccess", message);
        const id = this._nextId++;
        this._notificationsAtom.push({
            id,
            message,
            type: ENotificationType.SUCCESS,
        });
        toast.success(message, { dismissible: true });
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
}
