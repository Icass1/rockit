// This file is generated using: python3 -m backend models
// Do not modify this file manually.

import { z } from "zod";
import { NotificationResponseSchema } from "./notificationResponse";

export const NotificationsResponseSchema = z.object({
    items: z.array(z.lazy(() => NotificationResponseSchema)),
});

export type NotificationsResponse = z.infer<typeof NotificationsResponseSchema>;
