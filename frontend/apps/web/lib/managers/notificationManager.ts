import { ENotificationType } from "@/models/enums/notificationType";
import { INotification } from "@/models/interfaces/notification";
import { createArrayAtom } from "@/lib/store";

export class NotificationManager {
    private _notificationsAtom = createArrayAtom<INotification>([]);
    private _nextId = 0;

    notifyError(message: string) {
        const id = this._nextId++;
        this._notificationsAtom.push({
            id,
            message,
            type: ENotificationType.ERROR,
        });
        setTimeout(() => this.dismiss(id), 4000);
    }

    notifyInfo(message: string) {
        const id = this._nextId++;
        this._notificationsAtom.push({
            id,
            message,
            type: ENotificationType.INFO,
        });
        setTimeout(() => this.dismiss(id), 4000);
    }

    notifySuccess(message: string) {
        const id = this._nextId++;
        this._notificationsAtom.push({
            id,
            message,
            type: ENotificationType.SUCCESS,
        });
        setTimeout(() => this.dismiss(id), 4000);
    }

    dismiss(id: number) {
        const current = this._notificationsAtom.get();
        this._notificationsAtom.set(current.filter((n) => n.id !== id));
    }

    get notificationsAtom() {
        return this._notificationsAtom.getReadonlyAtom();
    }

    get notificationsAtomForDirectAccess() {
        return this._notificationsAtom;
    }
}
