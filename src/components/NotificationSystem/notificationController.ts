// NotificationController.ts
type NotificationType = "success" | "error" | "info" | "warning" | "debug";

export const NotificationController = {
    add: (
        message: string,
        level: NotificationType = "info",
        duration: number = 5
    ) => {
        console.warn("NotificationController not initialized yet");
        console.warn(`add(${message}, ${level}, ${duration})`);
    },
};

export type { NotificationType };
