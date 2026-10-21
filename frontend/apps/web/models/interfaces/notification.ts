import { z } from "zod";
import { ENotificationType } from "@/models/enums/notificationType";

export const NotificationSchema = z.object({
    id: z.number(),
    message: z.string(),
    type: z.nativeEnum(ENotificationType),
    category: z.enum(["activity", "download", "import", "release"]),
    createdAt: z.number(),
    read: z.boolean(),
    key: z.string().optional(),
    detail: z.string().optional(),
});
export type INotification = z.infer<typeof NotificationSchema>;
export type NotificationCategory = INotification["category"];
export interface NotificationOptions {
    category?: NotificationCategory;
    key?: string;
    detail?: string;
    toast?: boolean;
}
export interface ReleaseAnnouncement {
    version: string;
    date: string;
    titleKey: string;
    detailKey: string;
}
