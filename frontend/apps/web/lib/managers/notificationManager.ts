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
        setTimeout((): void => this.dismiss(id), 4000);
    }

    notifyInfo(message: string): void {
        console.error("NotificationManager.notifyInfo", message);
        const id = this._nextId++;
        this._notificationsAtom.push({
            id,
            message,
            type: ENotificationType.INFO,
        });
        setTimeout((): void => this.dismiss(id), 4000);
    }

    notifySuccess(message: string): void {
        console.error("NotificationManager.notifySuccess", message);
        const id = this._nextId++;
        this._notificationsAtom.push({
            id,
            message,
            type: ENotificationType.SUCCESS,
        });
        setTimeout((): void => this.dismiss(id), 4000);
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
