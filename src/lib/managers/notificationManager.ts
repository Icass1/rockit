export class NotificationManager {
    constructor() {}

    notifyError(message: string) {
        console.error(message);
    }
    notifyInfo(message: string) {
        console.info(message);
    }
}
