import { createArrayAtom } from "@/lib/store";

export class NotificationManager {
    private _notificationsAtom = createArrayAtom<{
        id: number;
        message: string;
    }>([]);

    constructor() {}

    notifyError(message: string) {
        console.error(message);
    }
    notifyInfo(message: string) {
        console.info(message);
    }

    get notifycationsAtom() {
        return this._notificationsAtom;
    }
}
