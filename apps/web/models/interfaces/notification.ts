import type { NotificationResponse } from "@rockit/shared";

export type INotification = NotificationResponse;
export interface NotificationOptions {
    category?: "activity" | "release" | "download" | "import";
    key?: string;
    detail?: string;
    toast?: boolean;
}
