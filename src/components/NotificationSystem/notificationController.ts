// NotificationController.ts
type NotificationType = "success" | "error" | "info";

export const NotificationController = {
    add: (message: string, type: NotificationType = "info") => {
        console.warn("NotificationController not initialized yet");
        console.warn(`add(${message}, ${type})`);
    },
};

export type { NotificationType };
