// This file is generated using: python3 -m apps.backend models
// Do not modify this file manually.

import { z } from "zod";

export const NotificationsReadRequestSchema = z.object({
    ids: z.array(z.string()),
});

export type NotificationsReadRequest = z.infer<
    typeof NotificationsReadRequestSchema
>;
