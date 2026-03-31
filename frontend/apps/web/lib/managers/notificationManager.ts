import { createArrayAtom } from "@/lib/store";

export interface Notification {
    id: number;
    message: string;
    type: "error" | "info" | "success";
}

export class NotificationManager {
    private _notificationsAtom = createArrayAtom<Notification>([]);
    private _nextId = 0;

    notifyError(message: string) {
        const id = this._nextId++;
        this._notificationsAtom.push({ id, message, type: "error" });
        setTimeout(() => this.dismiss(id), 4000);
    }

    notifyInfo(message: string) {
        const id = this._nextId++;
        this._notificationsAtom.push({ id, message, type: "info" });
        setTimeout(() => this.dismiss(id), 4000);
    }

    notifySuccess(message: string) {
        const id = this._nextId++;
        this._notificationsAtom.push({ id, message, type: "success" });
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
