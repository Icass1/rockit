// This file is generated using: python3 -m apps.backend models
// Do not modify this file manually.

import { z } from "zod";
import { NotificationResponseSchema } from "./notificationResponse";

export const NotificationPageResponseSchema = z.object({
    items: z.array(z.lazy(() => NotificationResponseSchema)),
    unreadCount: z.number(),
    totalCount: z.number(),
});

export type NotificationPageResponse = z.infer<
    typeof NotificationPageResponseSchema
>;
