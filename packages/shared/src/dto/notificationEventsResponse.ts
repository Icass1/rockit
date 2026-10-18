// This file is generated using: python3 -m backend models
// Do not modify this file manually.

import { z } from "zod";
import { NotificationEventResponseSchema } from "./notificationEventResponse";

export const NotificationEventsResponseSchema = z.object({
    events: z.array(z.lazy(() => NotificationEventResponseSchema)),
});

export type NotificationEventsResponse = z.infer<
    typeof NotificationEventsResponseSchema
>;
