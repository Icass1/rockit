// This file is generated using: python3 -m apps.backend models
// Do not modify this file manually.

import { z } from "zod";

export const NotificationActivityRequestSchema = z.object({
    message: z.string(),
    type: z.number(),
    detail: z.string().nullable(),
    key: z.string(),
});

export type NotificationActivityRequest = z.infer<
    typeof NotificationActivityRequestSchema
>;
