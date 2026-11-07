// This file is generated using: python3 -m apps.backend models
// Do not modify this file manually.

import { z } from "zod";

export const NotificationStateMessageSchema = z.object({
    type: z
        .union([z.literal("notification_state")])
        .default("notification_state"),
    unreadCount: z.number(),
    totalCount: z.number(),
});

export type NotificationStateMessage = z.infer<
    typeof NotificationStateMessageSchema
>;
