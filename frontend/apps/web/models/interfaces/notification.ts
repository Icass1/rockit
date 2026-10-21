import {
    LegacyNotificationRequestSchema,
    LegacyNotificationsRequestSchema,
    NotificationResponseSchema,
} from "@rockit/shared";
import { z } from "zod";
import { ENotificationType } from "@/models/enums/notificationType";

export const NotificationSchema = NotificationResponseSchema.extend({
    type: z.nativeEnum(ENotificationType),
});
export type INotification = z.infer<typeof NotificationSchema>;
export type NotificationCategory = INotification["category"];
export interface NotificationOptions {
    category?: NotificationCategory;
    key?: string;
    detail?: string;
    toast?: boolean;
}

// Only used to transfer the previous browser-local inbox to the server.
export const LegacyNotificationsStorageSchema =
    LegacyNotificationsRequestSchema.extend({
        items: LegacyNotificationRequestSchema.extend({
            key: z.string().nullable().default(null),
            detail: z.string().nullable().default(null),
        })
            .array()
            .max(100),
    });
